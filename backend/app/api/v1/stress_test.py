from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from app.database import get_db
from app.schemas.transfer import ConcurrencyStressTestRequest, ConcurrencyStressTestResponse
from app.services.ledger_service import ledger_service
from app.models.account import Account, AccountType, AccountStatus
from app.models.ledger import LedgerTransaction, LedgerEntry
from app.models.idempotency import IdempotencyRecord

router = APIRouter(prefix="/stress-test", tags=["Concurrency Stress Test"])

@router.post("/run", response_model=ConcurrencyStressTestResponse)
async def run_stress_test(request: ConcurrencyStressTestRequest):
    """
    Executes automated parallel transfers (default: 50 concurrent requests)
    to rigorously verify zero race-conditions, no double-spending,
    and ledger double-entry balance consistency under extreme load.
    """
    try:
        result = await ledger_service.run_concurrency_stress_test(
            source_account_id=request.source_account_id,
            destination_account_id=request.destination_account_id,
            amount_cents_per_request=request.amount_cents_per_request,
            concurrent_requests=request.concurrent_requests
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stress test execution failed: {str(e)}")

@router.post("/reset")
async def reset_stress_test_accounts(db: AsyncSession = Depends(get_db)):
    """
    Resets the designated stress test accounts to their clean initial state:
    Source = $100.00 (10000 cents), Target = $0.00 (0 cents)
    """
    # Find or re-create stress test source & target
    source = await db.get(Account, "acc-stress-source-004")
    dest = await db.get(Account, "acc-stress-target-005")

    if not source:
        source = Account(
            id="acc-stress-source-004",
            account_number="ACC-4004-6656",
            holder_name="High-Concurrency Stress Test Account",
            account_type=AccountType.USER_CHECKING.value,
            currency="USD",
            balance=10000,
            status=AccountStatus.ACTIVE.value,
        )
        db.add(source)
    else:
        source.balance = 10000

    if not dest:
        dest = Account(
            id="acc-stress-target-005",
            account_number="ACC-5005-5567",
            holder_name="Concurrency Vault Target Account",
            account_type=AccountType.USER_SAVINGS.value,
            currency="USD",
            balance=0,
            status=AccountStatus.ACTIVE.value,
        )
        db.add(dest)
    else:
        dest.balance = 0

    await db.commit()
    return {
        "status": "reset_successful",
        "source_account": source.to_dict(),
        "target_account": dest.to_dict(),
        "message": "Stress test accounts reset: Source has $100.00 (10,000 cents), Target has $0.00"
    }
