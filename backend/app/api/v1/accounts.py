from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.account import AccountCreate, AccountResponse
from app.services.account_service import account_service

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("", response_model=List[AccountResponse])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    accounts = await account_service.list_accounts(db)
    return [AccountResponse(**acc.to_dict()) for acc in accounts]

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(account_in: AccountCreate, db: AsyncSession = Depends(get_db)):
    acc = await account_service.create_account(
        db, account_in, initial_balance_cents=account_in.initial_deposit_cents
    )
    return AccountResponse(**acc.to_dict())

@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str, db: AsyncSession = Depends(get_db)):
    acc = await account_service.get_account(db, account_id)
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return AccountResponse(**acc.to_dict())
