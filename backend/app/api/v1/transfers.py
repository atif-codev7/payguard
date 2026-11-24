import json
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.transfer import TransferRequest, TransferResponse
from app.services.ledger_service import (
    ledger_service,
    InsufficientFundsError,
    AccountNotFoundError,
    AccountInactiveError,
    InvalidTransferError
)
from app.middleware.idempotency import IdempotencyManager, compute_payload_hash

router = APIRouter(prefix="/transfers", tags=["Transfers"])

@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    request: TransferRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute high-concurrency double-entry ledger transfer.
    Supports client-provided Idempotency-Key header for safe retries.
    Uses row-level locking (with_for_update) to prevent double-spending.
    """
    is_replay = False
    payload_hash = compute_payload_hash("/api/v1/transfers", request.model_dump())

    if idempotency_key:
        record, is_replay = await IdempotencyManager.check_or_lock(
            db, idempotency_key, "/api/v1/transfers", payload_hash
        )
        if is_replay:
            cached_data = json.loads(record.response_body)
            return JSONResponse(
                content=cached_data,
                status_code=record.response_code or status.HTTP_201_CREATED,
                headers={"Idempotent-Replay": "true"}
            )

    try:
        response = await ledger_service.execute_transfer(
            db, request, idempotency_key=idempotency_key
        )
        
        response_data = response.model_dump(mode="json")

        if idempotency_key:
            await IdempotencyManager.complete(
                db, idempotency_key, status.HTTP_201_CREATED, response_data
            )

        return response_data

    except InsufficientFundsError as e:
        if idempotency_key:
            await IdempotencyManager.fail(db, idempotency_key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    except AccountNotFoundError as e:
        if idempotency_key:
            await IdempotencyManager.fail(db, idempotency_key)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)

    except (AccountInactiveError, InvalidTransferError) as e:
        if idempotency_key:
            await IdempotencyManager.fail(db, idempotency_key)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)

    except Exception as e:
        if idempotency_key:
            await IdempotencyManager.fail(db, idempotency_key)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ledger transfer failed: {str(e)}")
