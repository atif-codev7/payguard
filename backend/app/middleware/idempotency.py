import hashlib
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import Header, HTTPException, status
from app.models.idempotency import IdempotencyRecord, IdempotencyStatus
from app.config import settings

def ensure_utc(dt: datetime) -> datetime:
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

def compute_payload_hash(path: str, body: dict) -> str:
    canonical = json.dumps(body, sort_keys=True)
    return hashlib.sha256(f"{path}:{canonical}".encode()).hexdigest()

class IdempotencyManager:
    @staticmethod
    async def check_or_lock(
        db: AsyncSession,
        idempotency_key: str,
        path: str,
        payload_hash: str
    ) -> Tuple[Optional[IdempotencyRecord], bool]:
        """
        Returns (record, is_replay)
        - If replay: record is returned and is_replay is True
        - If new acquisition: record is created in PROCESSING state and is_replay is False
        - If conflict: raises HTTPException(409)
        """
        stmt = select(IdempotencyRecord).where(IdempotencyRecord.key == idempotency_key)
        res = await db.execute(stmt)
        record = res.scalars().first()

        now = datetime.now(timezone.utc)

        if record:
            if record.status == IdempotencyStatus.COMPLETED.value:
                # Validate that payload parameters match
                if record.request_params_hash != payload_hash:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="Idempotency key was previously used with a different request payload"
                    )
                return record, True
            
            elif record.status == IdempotencyStatus.PROCESSING.value:
                # Check if lock expired
                if now < ensure_utc(record.locked_until):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Concurrent request already in progress with this idempotency key"
                    )
                # Lock expired: take over
                record.status = IdempotencyStatus.PROCESSING.value
                record.locked_until = now + timedelta(seconds=settings.IDEMPOTENCY_LOCK_TTL_SECONDS)
                await db.commit()
                return record, False
            
            else: # FAILED
                record.status = IdempotencyStatus.PROCESSING.value
                record.locked_until = now + timedelta(seconds=settings.IDEMPOTENCY_LOCK_TTL_SECONDS)
                await db.commit()
                return record, False

        # Attempt to insert new record; handle race condition where another worker inserted concurrently
        new_record = IdempotencyRecord(
            key=idempotency_key,
            request_path=path,
            request_params_hash=payload_hash,
            status=IdempotencyStatus.PROCESSING.value,
            locked_until=now + timedelta(seconds=settings.IDEMPOTENCY_LOCK_TTL_SECONDS),
        )
        try:
            db.add(new_record)
            await db.commit()
            return new_record, False
        except IntegrityError:
            await db.rollback()
            # Fetch the winning record that was inserted in parallel
            res2 = await db.execute(select(IdempotencyRecord).where(IdempotencyRecord.key == idempotency_key))
            winning_record = res2.scalars().first()
            if winning_record and winning_record.status == IdempotencyStatus.COMPLETED.value:
                return winning_record, True
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Concurrent request already in progress with this idempotency key"
            )

    @staticmethod
    async def complete(
        db: AsyncSession,
        idempotency_key: str,
        response_code: int,
        response_data: dict
    ):
        stmt = select(IdempotencyRecord).where(IdempotencyRecord.key == idempotency_key)
        res = await db.execute(stmt)
        record = res.scalars().first()
        if record:
            record.status = IdempotencyStatus.COMPLETED.value
            record.response_code = response_code
            record.response_body = json.dumps(response_data)
            await db.commit()

    @staticmethod
    async def fail(db: AsyncSession, idempotency_key: str):
        stmt = select(IdempotencyRecord).where(IdempotencyRecord.key == idempotency_key)
        res = await db.execute(stmt)
        record = res.scalars().first()
        if record:
            record.status = IdempotencyStatus.FAILED.value
            await db.commit()
