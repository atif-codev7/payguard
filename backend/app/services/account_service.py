import random
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.account import Account, AccountType, AccountStatus
from app.schemas.account import AccountCreate

def generate_account_number() -> str:
    return f"ACC-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

class AccountService:
    @staticmethod
    async def create_account(
        db: AsyncSession, 
        account_in: AccountCreate, 
        initial_balance_cents: int = 0
    ) -> Account:
        account = Account(
            id=str(uuid.uuid4()),
            account_number=generate_account_number(),
            holder_name=account_in.holder_name,
            account_type=account_in.account_type,
            currency=account_in.currency,
            balance=initial_balance_cents,
            status=AccountStatus.ACTIVE.value,
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def get_account(db: AsyncSession, account_id: str) -> Optional[Account]:
        result = await db.execute(select(Account).where(Account.id == account_id))
        return result.scalars().first()

    @staticmethod
    async def list_accounts(db: AsyncSession, limit: int = 50) -> List[Account]:
        result = await db.execute(
            select(Account).order_by(Account.created_at.asc()).limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def seed_demo_accounts(db: AsyncSession) -> List[Account]:
        existing = await AccountService.list_accounts(db, limit=5)
        if existing:
            return existing

        # Create demo ecosystem accounts
        demo_accounts = [
            Account(
                id="acc-alice-checking-001",
                account_number="ACC-1001-9921",
                holder_name="Alice Johnson (Primary Checking)",
                account_type=AccountType.USER_CHECKING.value,
                currency="USD",
                balance=50000,  # $500.00
                status=AccountStatus.ACTIVE.value,
            ),
            Account(
                id="acc-bob-savings-002",
                account_number="ACC-2002-8834",
                holder_name="Bob Smith (High-Yield Savings)",
                account_type=AccountType.USER_SAVINGS.value,
                currency="USD",
                balance=25000,  # $250.00
                status=AccountStatus.ACTIVE.value,
            ),
            Account(
                id="acc-charlie-merchant-003",
                account_number="ACC-3003-7745",
                holder_name="Charlie Apex Corp (Merchant Settlement)",
                account_type=AccountType.USER_CHECKING.value,
                currency="USD",
                balance=100000, # $1,000.00
                status=AccountStatus.ACTIVE.value,
            ),
            Account(
                id="acc-stress-source-004",
                account_number="ACC-4004-6656",
                holder_name="High-Concurrency Stress Test Account",
                account_type=AccountType.USER_CHECKING.value,
                currency="USD",
                balance=10000,  # $100.00 exactly (10 x $10 transfers max!)
                status=AccountStatus.ACTIVE.value,
            ),
            Account(
                id="acc-stress-target-005",
                account_number="ACC-5005-5567",
                holder_name="Concurrency Vault Target Account",
                account_type=AccountType.USER_SAVINGS.value,
                currency="USD",
                balance=0,      # $0.00
                status=AccountStatus.ACTIVE.value,
            ),
            Account(
                id="acc-system-reserve-000",
                account_number="SYS-0000-0001",
                holder_name="PayGuard System Central Clearing House",
                account_type=AccountType.SYSTEM_SETTLEMENT.value,
                currency="USD",
                balance=0,
                status=AccountStatus.ACTIVE.value,
            ),
        ]

        for acc in demo_accounts:
            db.add(acc)
        await db.commit()
        return demo_accounts

account_service = AccountService()
