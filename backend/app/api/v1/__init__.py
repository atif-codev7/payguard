from fastapi import APIRouter
from app.api.v1.accounts import router as accounts_router
from app.api.v1.transfers import router as transfers_router
from app.api.v1.ledger import router as ledger_router
from app.api.v1.stress_test import router as stress_test_router

api_v1_router = APIRouter()
api_v1_router.include_router(accounts_router)
api_v1_router.include_router(transfers_router)
api_v1_router.include_router(ledger_router)
api_v1_router.include_router(stress_test_router)
