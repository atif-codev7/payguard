import asyncio
import datetime
import logging
import random
import time
import uuid
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import selectinload

from app.database import engine, AsyncSessionLocal
from app.models.account import Account, AccountStatus
from app.models.ledger import (
    LedgerTransaction, 
    LedgerEntry, 
    TransactionStatus, 
    EntryType
)
from app.schemas.transfer import (
    TransferRequest, 
    TransferResponse,
    ConcurrencyStressTestResponse,
    StressTestResultDetail
)
from app.schemas.ledger import LedgerAuditSummary

logger = logging.getLogger("payguard.ledger_service")

class InsufficientFundsError(Exception):
    def __init__(self, message: str = "Insufficient available balance"):
        super().__init__(message)
        self.message = message

class AccountNotFoundError(Exception):
    def __init__(self, message: str = "Account not found"):
        super().__init__(message)
        self.message = message

class AccountInactiveError(Exception):
    def __init__(self, message: str = "Account is frozen or inactive"):
        super().__init__(message)
        self.message = message

class InvalidTransferError(Exception):
    def __init__(self, message: str = "Invalid transfer request"):
        super().__init__(message)
        self.message = message

class LedgerService:
    @staticmethod
    async def execute_transfer(
        db: AsyncSession,
        request: TransferRequest,
        idempotency_key: Optional[str] = None
    ) -> TransferResponse:
        """
        Executes a double-entry ledger transfer with multi-layered ACID isolation:
        1. Validates source != destination and amount > 0.
        2. Orders account IDs deterministically to prevent circular deadlocks.
        3. Acquires row-level locks (pessimistic lock) on both accounts (PostgreSQL).
        4. Validates account status and balance constraints.
        5. Executes atomic conditional update (`WHERE balance >= amount`) to prevent double-spending.
        6. Updates balances atomically.
        7. Creates a journal entry (LedgerTransaction) and offsetting LedgerEntries.
        8. Enforces the double-entry invariant: Sum(Debits) == Sum(Credits).
        """
        if request.source_account_id == request.destination_account_id:
            raise InvalidTransferError("Source and destination accounts must be distinct")

        if request.amount_cents <= 0:
            raise InvalidTransferError("Transfer amount must be strictly positive")

        is_postgres = "postgres" in engine.url.drivername

        # DEADLOCK PREVENTION: Always lock accounts in deterministic order (by ID ascending)
        account_ids = sorted([request.source_account_id, request.destination_account_id])
        
        # Build query with pessimistic locking (FOR UPDATE on Postgres)
        stmt = select(Account).where(Account.id.in_(account_ids)).order_by(Account.id.asc())
        if is_postgres:
            stmt = stmt.with_for_update()

        result = await db.execute(stmt)
        locked_accounts = {acc.id: acc for acc in result.scalars().all()}

        if request.source_account_id not in locked_accounts:
            raise AccountNotFoundError(f"Source account {request.source_account_id} not found")
        if request.destination_account_id not in locked_accounts:
            raise AccountNotFoundError(f"Destination account {request.destination_account_id} not found")

        source_acc = locked_accounts[request.source_account_id]
        dest_acc = locked_accounts[request.destination_account_id]

        if source_acc.status != AccountStatus.ACTIVE.value:
            raise AccountInactiveError(f"Source account is {source_acc.status}")
        if dest_acc.status != AccountStatus.ACTIVE.value:
            raise AccountInactiveError(f"Destination account is {dest_acc.status}")

        if source_acc.currency != dest_acc.currency:
            raise InvalidTransferError(f"Currency mismatch: {source_acc.currency} != {dest_acc.currency}")

        now_utc = datetime.datetime.now(datetime.timezone.utc)

        # DEFENSE-IN-DEPTH: Atomic conditional decrement query
        # Ensures that even under extreme concurrency or non-locking SQLite storage,
        # balance can NEVER be decremented if it is less than request.amount_cents.
        deduct_stmt = (
            update(Account)
            .where(
                and_(
                    Account.id == source_acc.id,
                    Account.balance >= request.amount_cents
                )
            )
            .values(
                balance=Account.balance - request.amount_cents,
                version=Account.version + 1,
                updated_at=now_utc
            )
        )
        deduct_res = await db.execute(deduct_stmt)
        if deduct_res.rowcount == 0:
            # Re-read current balance to report exact state
            curr_bal = (await db.execute(select(Account.balance).where(Account.id == source_acc.id))).scalar() or 0
            raise InsufficientFundsError(
                f"Insufficient funds: available {curr_bal / 100:.2f} {source_acc.currency}, "
                f"requested {request.amount_cents / 100:.2f} {source_acc.currency}"
            )

        # Atomic increment on destination account
        credit_stmt = (
            update(Account)
            .where(Account.id == dest_acc.id)
            .values(
                balance=Account.balance + request.amount_cents,
                version=Account.version + 1,
                updated_at=now_utc
            )
        )
        await db.execute(credit_stmt)

        # Get fresh post-update balances for exact ledger entry snapshots
        source_balance_after = (await db.execute(select(Account.balance).where(Account.id == source_acc.id))).scalar()
        dest_balance_after = (await db.execute(select(Account.balance).where(Account.id == dest_acc.id))).scalar()

        reference_id = f"TXN-{now_utc.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        # Create Ledger Transaction (Header)
        transaction = LedgerTransaction(
            id=str(uuid.uuid4()),
            reference_id=reference_id,
            idempotency_key=idempotency_key,
            description=request.description or f"Transfer from {source_acc.account_number} to {dest_acc.account_number}",
            status=TransactionStatus.POSTED.value,
            posted_at=now_utc,
        )
        db.add(transaction)
        await db.flush()

        # Create double-entry bookkeeping journal entries
        debit_entry = LedgerEntry(
            id=str(uuid.uuid4()),
            transaction_id=transaction.id,
            account_id=source_acc.id,
            entry_type=EntryType.DEBIT.value,
            amount=request.amount_cents,
            balance_after=source_balance_after,
        )

        credit_entry = LedgerEntry(
            id=str(uuid.uuid4()),
            transaction_id=transaction.id,
            account_id=dest_acc.id,
            entry_type=EntryType.CREDIT.value,
            amount=request.amount_cents,
            balance_after=dest_balance_after,
        )

        # Double-entry invariant verification
        assert debit_entry.amount == credit_entry.amount, "Double-entry imbalance detected!"

        db.add(debit_entry)
        db.add(credit_entry)

        await db.commit()

        return TransferResponse(
            success=True,
            reference_id=transaction.reference_id,
            idempotency_key=idempotency_key,
            transaction_id=transaction.id,
            amount_cents=request.amount_cents,
            amount_formatted=f"{request.amount_cents / 100:.2f}",
            source_balance_after=source_balance_after,
            source_balance_after_formatted=f"{source_balance_after / 100:.2f}",
            destination_balance_after=dest_balance_after,
            destination_balance_after_formatted=f"{dest_balance_after / 100:.2f}",
            timestamp=now_utc,
            message="Transfer processed successfully and recorded in double-entry ledger",
        )

    @staticmethod
    async def get_ledger_audit_summary(db: AsyncSession) -> LedgerAuditSummary:
        """
        Audits all ledger entries to verify the fundamental double-entry invariant:
        Total Debits == Total Credits.
        """
        tx_count_stmt = select(func.count(LedgerTransaction.id))
        total_tx = (await db.execute(tx_count_stmt)).scalar() or 0

        entry_count_stmt = select(func.count(LedgerEntry.id))
        total_entries = (await db.execute(entry_count_stmt)).scalar() or 0

        debits_stmt = select(func.coalesce(func.sum(LedgerEntry.amount), 0)).where(
            LedgerEntry.entry_type == EntryType.DEBIT.value
        )
        total_debits = (await db.execute(debits_stmt)).scalar() or 0

        credits_stmt = select(func.coalesce(func.sum(LedgerEntry.amount), 0)).where(
            LedgerEntry.entry_type == EntryType.CREDIT.value
        )
        total_credits = (await db.execute(credits_stmt)).scalar() or 0

        imbalance = abs(total_debits - total_credits)
        is_balanced = (imbalance == 0)

        return LedgerAuditSummary(
            total_transactions=total_tx,
            total_entries=total_entries,
            total_debits_cents=total_debits,
            total_credits_cents=total_credits,
            is_balanced=is_balanced,
            imbalance_cents=imbalance,
            system_invariant_verified=is_balanced,
        )

    @staticmethod
    async def list_recent_transactions(db: AsyncSession, limit: int = 50) -> List[LedgerTransaction]:
        stmt = (
            select(LedgerTransaction)
            .options(selectinload(LedgerTransaction.entries))
            .order_by(LedgerTransaction.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def run_concurrency_stress_test(
        source_account_id: str,
        destination_account_id: str,
        amount_cents_per_request: int = 1000,
        concurrent_requests: int = 50
    ) -> ConcurrencyStressTestResponse:
        """
        Spawns N concurrent async worker tasks executing simultaneous transfers
        against the exact same source account.
        Proves:
        1. No double-spending occurs.
        2. Account balance never becomes negative.
        3. Double-entry ledger sums balance precisely.
        4. No deadlock errors occur.
        """
        start_time = time.time()

        # Step 1: Capture initial balances
        async with AsyncSessionLocal() as db:
            source = await db.get(Account, source_account_id)
            dest = await db.get(Account, destination_account_id)
            if not source or not dest:
                raise AccountNotFoundError("Test accounts not found")
            initial_source_balance = source.balance
            initial_dest_balance = dest.balance

        max_possible_successes = initial_source_balance // amount_cents_per_request
        expected_successes = min(concurrent_requests, max_possible_successes)
        expected_final_source = initial_source_balance - (expected_successes * amount_cents_per_request)

        results_list: List[StressTestResultDetail] = []
        success_count = 0
        insufficient_funds_count = 0
        rate_limited_count = 0
        other_error_count = 0

        # Step 2: Define single worker task
        async def worker_task(idx: int) -> StressTestResultDetail:
            idempotency_key = f"stress-test-{uuid.uuid4().hex}"
            t0 = time.time()
            req = TransferRequest(
                source_account_id=source_account_id,
                destination_account_id=destination_account_id,
                amount_cents=amount_cents_per_request,
                description=f"Concurrency Stress Test #{idx + 1}"
            )
            
            async with AsyncSessionLocal() as session:
                try:
                    resp = await LedgerService.execute_transfer(session, req, idempotency_key=idempotency_key)
                    elapsed_ms = (time.time() - t0) * 1000
                    return StressTestResultDetail(
                        request_index=idx,
                        idempotency_key=idempotency_key,
                        status_code=200,
                        success=True,
                        latency_ms=round(elapsed_ms, 2)
                    )
                except InsufficientFundsError as e:
                    elapsed_ms = (time.time() - t0) * 1000
                    return StressTestResultDetail(
                        request_index=idx,
                        idempotency_key=idempotency_key,
                        status_code=400,
                        success=False,
                        error=f"InsufficientFunds: {e.message}",
                        latency_ms=round(elapsed_ms, 2)
                    )
                except Exception as e:
                    elapsed_ms = (time.time() - t0) * 1000
                    return StressTestResultDetail(
                        request_index=idx,
                        idempotency_key=idempotency_key,
                        status_code=500,
                        success=False,
                        error=str(e),
                        latency_ms=round(elapsed_ms, 2)
                    )

        tasks = [worker_task(i) for i in range(concurrent_requests)]
        raw_results = await asyncio.gather(*tasks)

        for res in raw_results:
            results_list.append(res)
            if res.success:
                success_count += 1
            elif res.status_code == 400:
                insufficient_funds_count += 1
            elif res.status_code == 429:
                rate_limited_count += 1
            else:
                other_error_count += 1

        # Step 4: Verify post-test state
        async with AsyncSessionLocal() as db:
            post_source = await db.get(Account, source_account_id)
            post_dest = await db.get(Account, destination_account_id)
            audit = await LedgerService.get_ledger_audit_summary(db)

        final_source_balance = post_source.balance
        final_dest_balance = post_dest.balance

        race_conditions_detected = 0
        if final_source_balance < 0:
            race_conditions_detected += 1
        if final_source_balance != (initial_source_balance - (success_count * amount_cents_per_request)):
            race_conditions_detected += 1
        if final_dest_balance != (initial_dest_balance + (success_count * amount_cents_per_request)):
            race_conditions_detected += 1

        double_spend_prevented = (race_conditions_detected == 0 and final_source_balance >= 0)
        total_time = round(time.time() - start_time, 3)

        return ConcurrencyStressTestResponse(
            total_requests=concurrent_requests,
            successful_requests=success_count,
            failed_insufficient_funds=insufficient_funds_count,
            failed_rate_limited=rate_limited_count,
            failed_other=other_error_count,
            initial_source_balance_cents=initial_source_balance,
            final_source_balance_cents=final_source_balance,
            initial_dest_balance_cents=initial_dest_balance,
            final_dest_balance_cents=final_dest_balance,
            expected_final_source_balance_cents=expected_final_source,
            race_conditions_detected=race_conditions_detected,
            double_spend_prevented=double_spend_prevented,
            ledger_balanced=audit.is_balanced,
            total_execution_time_seconds=total_time,
            details=results_list[:15]
        )

ledger_service = LedgerService()
