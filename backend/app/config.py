import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PayGuard Ledger System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./payguard.db"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_MOCK_REDIS: bool = os.getenv("USE_MOCK_REDIS", "true").lower() in ("true", "1", "t")
    
    # Sliding-Window Rate Limiting (Default: 60 requests per 60 seconds)
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
    DISABLE_RATE_LIMIT: bool = os.getenv("DISABLE_RATE_LIMIT", "false").lower() in ("true", "1", "t")
    
    # Idempotency lock timeout in seconds
    IDEMPOTENCY_LOCK_TTL_SECONDS: int = int(os.getenv("IDEMPOTENCY_LOCK_TTL_SECONDS", "120"))
    
    # AWS & Observability
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    CLOUDWATCH_LOG_GROUP: str = os.getenv("CLOUDWATCH_LOG_GROUP", "/ecs/payguard-api")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
