import pytest
from app.services.rate_limiter import rate_limiter

@pytest.mark.asyncio
async def test_sliding_window_rate_limiter_allows_and_blocks():
    test_key = "test-user-limit-check"
    limit = 5
    window_sec = 2

    # First 5 calls must be allowed
    for i in range(limit):
        allowed, count, remaining, reset_after = await rate_limiter.is_allowed(
            test_key, limit=limit, window_seconds=window_sec
        )
        assert allowed is True
        assert count == i + 1
        assert remaining == limit - (i + 1)

    # 6th call must be blocked
    allowed, count, remaining, reset_after = await rate_limiter.is_allowed(
        test_key, limit=limit, window_seconds=window_sec
    )
    assert allowed is False
    assert remaining == 0
