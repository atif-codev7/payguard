from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.ledger import LedgerTransactionResponse, LedgerAuditSummary
from app.services.ledger_service import ledger_service

router = APIRouter(prefix="/ledger", tags=["Ledger"])

@router.get("/transactions", response_model=List[LedgerTransactionResponse])
async def list_transactions(limit: int = 50, db: AsyncSession = Depends(get_db)):
    txs = await ledger_service.list_recent_transactions(db, limit=limit)
    return [LedgerTransactionResponse(**tx.to_dict()) for tx in txs]

@router.get("/audit", response_model=LedgerAuditSummary)
async def get_audit_summary(db: AsyncSession = Depends(get_db)):
    """
    Returns audit verification proving that Sum(Debits) == Sum(Credits) across all accounts.
    """
    return await ledger_service.get_ledger_audit_summary(db)
