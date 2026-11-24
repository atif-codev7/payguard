from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.ledger import LedgerTransactionResponse

class TransferRequest(BaseModel):
    source_account_id: str = Field(..., description="UUID of source account to be debited")
    destination_account_id: str = Field(..., description="UUID of destination account to be credited")
    amount_cents: int = Field(..., gt=0, description="Transfer amount in integer cents (> 0)")
    description: Optional[str] = Field(default="Account transfer", max_length=255)

class TransferResponse(BaseModel):
    success: bool
    reference_id: str
    idempotency_key: Optional[str] = None
    transaction_id: str
    amount_cents: int
    amount_formatted: str
    source_balance_after: int
    source_balance_after_formatted: str
    destination_balance_after: int
    destination_balance_after_formatted: str
    timestamp: datetime
    message: str

class ConcurrencyStressTestRequest(BaseModel):
    source_account_id: str
    destination_account_id: str
    amount_cents_per_request: int = Field(default=1000, gt=0)  # $10.00 each
    concurrent_requests: int = Field(default=50, ge=2, le=100)

class StressTestResultDetail(BaseModel):
    request_index: int
    idempotency_key: str
    status_code: int
    success: bool
    error: Optional[str] = None
    latency_ms: float

class ConcurrencyStressTestResponse(BaseModel):
    total_requests: int
    successful_requests: int
    failed_insufficient_funds: int
    failed_rate_limited: int
    failed_other: int
    initial_source_balance_cents: int
    final_source_balance_cents: int
    initial_dest_balance_cents: int
    final_dest_balance_cents: int
    expected_final_source_balance_cents: int
    race_conditions_detected: int
    double_spend_prevented: bool
    ledger_balanced: bool
    total_execution_time_seconds: float
    details: List[StressTestResultDetail] = []
