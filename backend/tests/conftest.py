import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy import event

# Ensure environment uses test database, mock redis, and disables edge rate limit for tests
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_payguard.db"
os.environ["USE_MOCK_REDIS"] = "true"
os.environ["DISABLE_RATE_LIMIT"] = "true"

from app.config import settings
settings.DISABLE_RATE_LIMIT = True

from app.main import app
from app.database import Base, get_db
from app.services.account_service import account_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_payguard.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 60.0},
    poolclass=NullPool,
    echo=False
)

@event.listens_for(test_engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=60000")
    cursor.close()

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

@pytest_asyncio.fixture(scope="session", autouse=True)
async def prepare_database():
    # Setup test tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed default test accounts
    async with TestAsyncSessionLocal() as session:
        await account_service.seed_demo_accounts(session)

    yield

    # Teardown
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if os.path.exists("./test_payguard.db"):
        try:
            os.remove("./test_payguard.db")
        except Exception:
            pass

@pytest_asyncio.fixture
async def db_session():
    async with TestAsyncSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def client():
    async def override_get_db():
        async with TestAsyncSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()
