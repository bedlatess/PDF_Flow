"""
Redis-based Rate Limiting Middleware
基于 Redis 的滑动窗口限流器
"""
import time
from typing import Optional
from fastapi import Request, HTTPException, status
from redis import Redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Redis 滑动窗口限流器

    使用 Redis 的有序集合 (Sorted Set) 实现精确的滑动窗口限流
    """

    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
        identifier: str = "default"
    ) -> tuple[bool, dict]:
        """
        检查是否超过限流

        Args:
            key: 限流键（如 "api:upload"）
            max_requests: 时间窗口内最大请求数
            window_seconds: 时间窗口大小（秒）
            identifier: 唯一标识符（IP 或用户 ID）

        Returns:
            (is_allowed, info_dict): 是否允许请求和详细信息
        """
        try:
            # 构建 Redis 键
            redis_key = f"rate_limit:{key}:{identifier}"
            current_time = time.time()
            window_start = current_time - window_seconds

            # 使用 Redis pipeline 提高性能
            pipe = self.redis.pipeline()

            # 1. 删除窗口外的旧记录
            pipe.zremrangebyscore(redis_key, 0, window_start)

            # 2. 统计当前窗口内的请求数
            pipe.zcard(redis_key)

            # 3. 添加当前请求的时间戳
            pipe.zadd(redis_key, {str(current_time): current_time})

            # 4. 设置键的过期时间（防止内存泄漏）
            pipe.expire(redis_key, window_seconds + 10)

            # 执行 pipeline
            results = pipe.execute()
            request_count = results[1]  # zcard 的结果

            # 判断是否超过限流
            is_allowed = request_count < max_requests

            # 计算重置时间
            if request_count >= max_requests:
                # 获取最早的请求时间
                oldest = self.redis.zrange(redis_key, 0, 0, withscores=True)
                if oldest:
                    reset_time = oldest[0][1] + window_seconds
                else:
                    reset_time = current_time + window_seconds
            else:
                reset_time = current_time + window_seconds

            info = {
                "allowed": is_allowed,
                "limit": max_requests,
                "remaining": max(0, max_requests - request_count - 1) if is_allowed else 0,
                "reset": int(reset_time),
                "reset_after": int(reset_time - current_time),
                "current_requests": request_count
            }

            return is_allowed, info

        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # 限流器失败时，默认允许请求（fail-open）
            return True, {
                "allowed": True,
                "limit": max_requests,
                "remaining": max_requests,
                "error": str(e)
            }


class RateLimitMiddleware:
    """
    FastAPI 限流中间件
    """

    def __init__(self, redis_url: str):
        self.redis_client = Redis.from_url(redis_url, decode_responses=True)
        self.limiter = RateLimiter(self.redis_client)

    def get_identifier(self, request: Request) -> str:
        """
        获取请求的唯一标识符

        优先级: user_id > api_key > ip_address
        """
        # 1. 如果是认证用户，使用 user_id
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.id}"

        # 2. 如果有 API Key，使用 API Key
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return f"apikey:{api_key[:16]}"  # 只使用前 16 位

        # 3. 默认使用 IP 地址
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            ip = forwarded_for.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"

        return f"ip:{ip}"

    async def apply_rate_limit(
        self,
        request: Request,
        max_requests: int,
        window_seconds: int,
        key_suffix: str = ""
    ):
        """
        应用限流规则

        Args:
            request: FastAPI Request 对象
            max_requests: 最大请求数
            window_seconds: 时间窗口（秒）
            key_suffix: 限流键后缀

        Raises:
            HTTPException: 超过限流时抛出 429 错误
        """
        identifier = self.get_identifier(request)

        # 构建限流键
        endpoint = request.url.path.replace("/", ":")
        rate_key = f"{endpoint}{':' + key_suffix if key_suffix else ''}"

        # 检查限流
        is_allowed, info = await self.limiter.check_rate_limit(
            key=rate_key,
            max_requests=max_requests,
            window_seconds=window_seconds,
            identifier=identifier
        )

        # 添加响应头
        request.state.rate_limit_info = info

        # 如果超过限流，抛出异常
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please try again in {info['reset_after']} seconds.",
                    "limit": info["limit"],
                    "reset": info["reset"],
                    "reset_after": info["reset_after"]
                },
                headers={
                    "X-RateLimit-Limit": str(info["limit"]),
                    "X-RateLimit-Remaining": str(info["remaining"]),
                    "X-RateLimit-Reset": str(info["reset"]),
                    "Retry-After": str(info["reset_after"])
                }
            )


# 全局限流中间件实例
rate_limit_middleware = RateLimitMiddleware(settings.REDIS_URL)


# 便捷的装饰器函数
def rate_limit(max_requests: int, window_seconds: int, key_suffix: str = ""):
    """
    限流装饰器

    用法:
        @router.post("/upload")
        @rate_limit(max_requests=10, window_seconds=60)
        async def upload_file(request: Request):
            ...
    """
    async def decorator(request: Request):
        await rate_limit_middleware.apply_rate_limit(
            request=request,
            max_requests=max_requests,
            window_seconds=window_seconds,
            key_suffix=key_suffix
        )

    return decorator
