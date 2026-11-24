import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, BigInteger, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    POSTED = "POSTED"
    REJECTED = "REJECTED"
    REVERSED = "REVERSED"

class EntryType(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reference_id = Column(String(64), unique=True, nullable=False, index=True)
    idempotency_key = Column(String(128), unique=True, nullable=True, index=True)
    description = Column(String(255), nullable=False)
    status = Column(String(16), nullable=False, default=TransactionStatus.POSTED.value)
    
    posted_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )
    created_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    entries = relationship("LedgerEntry", back_populates="transaction", cascade="all, delete-orphan", lazy="selectin")

    def to_dict(self):
        return {
            "id": self.id,
            "reference_id": self.reference_id,
            "idempotency_key": self.idempotency_key,
            "description": self.description,
            "status": self.status,
            "posted_at": self.posted_at.isoformat() if self.posted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "entries": [e.to_dict() for e in self.entries] if self.entries else [],
        }

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String(36), ForeignKey("ledger_transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    entry_type = Column(String(8), nullable=False)  # DEBIT or CREDIT
    amount = Column(BigInteger, nullable=False)     # Positive integer in cents
    balance_after = Column(BigInteger, nullable=False)
    
    created_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    transaction = relationship("LedgerTransaction", back_populates="entries")
    account = relationship("Account", back_populates="entries")

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_positive_amount"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "account_id": self.account_id,
            "entry_type": self.entry_type,
            "amount": self.amount,
            "amount_formatted": f"{self.amount / 100:.2f}",
            "balance_after": self.balance_after,
            "balance_after_formatted": f"{self.balance_after / 100:.2f}",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
