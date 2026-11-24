from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Integer, Text, DateTime
from app.database import Base

class IdempotencyStatus(str, enum.Enum):
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    key = Column(String(128), primary_key=True)
    request_path = Column(String(255), nullable=False)
    request_params_hash = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False, default=IdempotencyStatus.PROCESSING.value)
    response_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False
    )
    locked_until = Column(
        DateTime(timezone=True), 
        nullable=False
    )

    def is_locked(self) -> bool:
        if self.status != IdempotencyStatus.PROCESSING.value:
            return False
        return datetime.now(timezone.utc) < self.locked_until
