from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class LedgerEntryResponse(BaseModel):
    id: str
    transaction_id: str
    account_id: str
    entry_type: str
    amount: int
    amount_formatted: str
    balance_after: int
    balance_after_formatted: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class LedgerTransactionResponse(BaseModel):
    id: str
    reference_id: str
    idempotency_key: Optional[str] = None
    description: str
    status: str
    posted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    entries: List[LedgerEntryResponse] = []

    model_config = ConfigDict(from_attributes=True)

class LedgerAuditSummary(BaseModel):
    total_transactions: int
    total_entries: int
    total_debits_cents: int
    total_credits_cents: int
    is_balanced: bool
    imbalance_cents: int
    system_invariant_verified: bool
