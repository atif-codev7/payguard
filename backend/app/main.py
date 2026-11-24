import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.services.account_service import account_service
from app.middleware.logging import StructuredJsonLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.api.health import router as health_router
from app.api.v1 import api_v1_router

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("payguard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default accounts
    logger.info("Initializing PayGuard Financial Ledger...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        await account_service.seed_demo_accounts(session)
    logger.info("Database schemas and demo accounts initialized successfully")

    yield

    # Shutdown
    logger.info("Shutting down PayGuard Financial Ledger...")
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-Concurrency Financial Ledger System with ACID Isolation, Row-Level Locking, and Double-Entry Accounting",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Request-ID", 
        "X-RateLimit-Limit", 
        "X-RateLimit-Remaining", 
        "X-RateLimit-Reset",
        "Idempotent-Replay"
    ]
)

# Custom Middlewares
app.add_middleware(StructuredJsonLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Route Handlers
app.include_router(health_router)
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the transaction",
            "detail": str(exc) if settings.ENVIRONMENT == "development" else None
        }
    )
