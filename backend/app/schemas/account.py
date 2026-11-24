from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class AccountBase(BaseModel):
    holder_name: str = Field(..., min_length=2, max_length=128)
    account_type: str = Field(default="USER_CHECKING")
    currency: str = Field(default="USD", min_length=3, max_length=3)

class AccountCreate(AccountBase):
    initial_deposit_cents: int = Field(default=0, ge=0)

class AccountResponse(AccountBase):
    id: str
    account_number: str
    balance: int
    balance_formatted: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
