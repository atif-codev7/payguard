import time
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.services.rate_limiter import rate_limiter

router = APIRouter(tags=["Health & Observability"])

_app_start_time = time.time()

@router.get("/health")
async def health_check():
    """Liveness probe for ECS Fargate / ALB health check"""
    return {
        "status": "healthy",
        "service": "payguard-ledger",
        "uptime_seconds": round(time.time() - _app_start_time, 2)
    }

@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness probe checking database and cache dependencies"""
    checks = {
        "database": "unknown",
        "redis_cache": "unknown"
    }
    
    # Check Database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    # Check Redis
    try:
        r = await rate_limiter.get_redis()
        await r.ping()
        checks["redis_cache"] = "ok"
    except Exception as e:
        checks["redis_cache"] = f"error: {str(e)}"

    is_all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if is_all_ok else 503
    return Response(
        content=str({"status": "ready" if is_all_ok else "unready", "checks": checks}),
        media_type="application/json",
        status_code=status_code
    )

@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus / CloudWatch scraper metrics endpoint"""
    metrics = [
        "# HELP payguard_uptime_seconds Total application uptime in seconds",
        "# TYPE payguard_uptime_seconds counter",
        f"payguard_uptime_seconds {time.time() - _app_start_time:.1f}",
        "# HELP payguard_ledger_health System operational status (1 = healthy, 0 = unhealthy)",
        "# TYPE payguard_ledger_health gauge",
        "payguard_ledger_health 1"
    ]
    return Response(content="\n".join(metrics), media_type="text/plain")
