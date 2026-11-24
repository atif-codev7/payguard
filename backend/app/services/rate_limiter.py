import time
import uuid
from typing import Tuple, Optional
import redis.asyncio as aioredis
import fakeredis.aioredis as fake_aioredis
from app.config import settings
import logging

logger = logging.getLogger("payguard.rate_limiter")

class SlidingWindowRateLimiter:
    """
    Production-grade Redis Sliding Window Rate Limiter.
    Uses Redis Sorted Sets (ZSET) with millisecond timestamps as scores
    to provide exact sliding-window rate limiting.
    """
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None
        self._initialized = False

    async def get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            if settings.USE_MOCK_REDIS:
                logger.info("Using FakeRedis in-memory client for rate limiting")
                self._redis = fake_aioredis.FakeRedis(decode_responses=True)
            else:
                try:
                    logger.info(f"Connecting to Redis at {settings.REDIS_URL}")
                    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
                    await client.ping()
                    self._redis = client
                except Exception as e:
                    logger.warning(f"Failed to connect to Redis ({e}), falling back to FakeRedis")
                    self._redis = fake_aioredis.FakeRedis(decode_responses=True)
        return self._redis

    async def is_allowed(
        self, 
        key: str, 
        limit: Optional[int] = None, 
        window_seconds: Optional[int] = None
    ) -> Tuple[bool, int, int, int]:
        """
        Check and record an access attempt in a sliding window.
        
        Returns:
            (allowed: bool, current_usage: int, remaining: int, reset_after_seconds: int)
        """
        limit = limit or settings.RATE_LIMIT_REQUESTS
        window_seconds = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS
        
        r = await self.get_redis()
        now_ms = int(time.time() * 1000)
        window_start_ms = now_ms - (window_seconds * 1000)
        redis_key = f"ratelimit:{key}"
        member_id = f"{now_ms}:{uuid.uuid4().hex[:8]}"

        try:
            # Atomic transaction using pipeline
            pipe = r.pipeline(transaction=True)
            # Remove records older than the sliding window
            pipe.zremrangebyscore(redis_key, 0, window_start_ms)
            # Get current count within the window
            pipe.zcard(redis_key)
            # Add current request timestamp
            pipe.zadd(redis_key, {member_id: now_ms})
            # Set key expiration to window duration + buffer
            pipe.expire(redis_key, window_seconds + 5)
            
            results = await pipe.execute()
            current_count = results[1]  # count before this request

            if current_count < limit:
                # Allowed
                remaining = max(0, limit - (current_count + 1))
                return True, current_count + 1, remaining, window_seconds
            else:
                # Exceeded: remove the member we just optimistically inserted
                await r.zrem(redis_key, member_id)
                return False, current_count, 0, window_seconds
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open in case of Redis communication error to prevent customer outages,
            # but log a critical warning
            return True, 1, limit - 1, window_seconds

rate_limiter = SlidingWindowRateLimiter()
