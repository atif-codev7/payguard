from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from app.services.rate_limiter import rate_limiter
from app.config import settings

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Check if rate limiting is disabled globally (e.g. in test suites)
        if settings.DISABLE_RATE_LIMIT:
            return await call_next(request)

        # Skip health checks, docs, and metrics from rate limits
        path = request.url.path
        if path in ("/health", "/health/ready", "/metrics", "/docs", "/openapi.json"):
            return await call_next(request)
        
        # Concurrency stress test endpoint has its own internal load generator, so bypass edge rate limit
        if "/stress-test" in path:
            return await call_next(request)

        # Identifier: IP or API Key
        client_ip = request.client.host if request.client else "127.0.0.1"
        api_key = request.headers.get("X-API-Key", client_ip)
        
        allowed, current_count, remaining, reset_after = await rate_limiter.is_allowed(
            key=f"client:{api_key}",
            limit=settings.RATE_LIMIT_REQUESTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS
        )

        if not allowed:
            headers = {
                "X-RateLimit-Limit": str(settings.RATE_LIMIT_REQUESTS),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_after),
                "Retry-After": str(reset_after),
            }
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit is {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_WINDOW_SECONDS}s.",
                    "retry_after_seconds": reset_after
                },
                headers=headers
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_REQUESTS)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_after)
        return response
