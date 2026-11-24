import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class AccountType(str, enum.Enum):
    USER_CHECKING = "USER_CHECKING"
    USER_SAVINGS = "USER_SAVINGS"
    SYSTEM_RESERVE = "SYSTEM_RESERVE"
    SYSTEM_SETTLEMENT = "SYSTEM_SETTLEMENT"

class AccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FROZEN = "FROZEN"
    CLOSED = "CLOSED"

class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_number = Column(String(32), unique=True, nullable=False, index=True)
    holder_name = Column(String(128), nullable=False)
    account_type = Column(String(32), nullable=False, default=AccountType.USER_CHECKING.value)
    currency = Column(String(3), nullable=False, default="USD")
    # Balance in minor units (cents): e.g., $100.00 = 10000
    balance = Column(BigInteger, nullable=False, default=0)
    version = Column(Integer, nullable=False, default=0)
    status = Column(String(16), nullable=False, default=AccountStatus.ACTIVE.value)
    
    created_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    entries = relationship("LedgerEntry", back_populates="account", cascade="all, delete-orphan")

    __table_args__ = (
        # Ensure user accounts cannot drop below 0 cents (database level constraint)
        CheckConstraint(
            "(account_type = 'SYSTEM_SETTLEMENT') OR (balance >= 0)", 
            name="check_non_negative_balance"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "account_number": self.account_number,
            "holder_name": self.holder_name,
            "account_type": self.account_type,
            "currency": self.currency,
            "balance": self.balance,
            "balance_formatted": f"{self.balance / 100:.2f}",
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
