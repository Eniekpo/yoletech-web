---
title: Build a Token Bucket Rate Limiter with Python and Redis
date: 2026-11-11
category: AI & Workflow Automation
coverImage: /assets/blog/build-a-token-bucket-rate-limiter-with-python-and-redis.webp
summary: Uncontrolled traffic spikes, buggy client retry loops, and automated
  scrapers can exhaust database connections in seconds. A Token Bucket rate
  limiter protects your backend by enforcing a strict average request rate while
  still allowing legitimate short bursts.
featured: false
---
Build a Token Bucket Rate Limiter with Python and Redis

Uncontrolled traffic spikes, buggy client retry loops, and automated scrapers can exhaust database connections in seconds. A Token Bucket rate limiter protects your backend by enforcing a strict average request rate while still allowing legitimate short bursts.

Think of it as a bucket holding up to `B` tokens that refills continuously at `R` tokens per second. Each incoming request spends one token. When the bucket hits zero, the API immediately rejects the request with an `HTTP 429 Too Many Requests` status until new tokens refill.

4 Practical Implementation Steps:

1. Scope Client Keys: Identify callers by API key, authenticated user ID, or IP address (`rate:user:1042`).
2. Compute Elapsed Refill: Calculate time passed since the last request and add refilled tokens up to the bucket capacity ceiling.
3. Deduct Atomically: Check if at least 1 token exists, deduct it, and store the updated count and timestamp in Redis.
4. Return Rate Limit Headers: Include `X-RateLimit-Remaining` and `Retry-After` headers so client applications back off gracefully.

Working Python & Redis Implementation:

```
import time
import redis

r = redis.Redis(host="localhost", port=6379)

def allow_request(key: str, capacity: int, rate: float) -> bool:
    """Token bucket rate limiter.
    capacity: max tokens
    rate: tokens per second
    """
    now = time.time()
    tokens, last_ts = r.hmget(key, ["tok", "ts"])

    # Initialize if new key
    tokens = float(tokens) if tokens else float(capacity)
    elapsed = now - (float(last_ts) if last_ts else now)

    # Refill tokens
    tokens = min(float(capacity), tokens + elapsed * rate)

    if tokens < 1.0:
        return False

    # Consume 1 token
    r.hset(key, mapping={"tok": tokens - 1.0, "ts": now})
    return True
```

Important Technical Details:

* Atomicity: Under high concurrency, wrap the read-compute-write logic inside a Redis Lua script (`EVAL`) so parallel requests never trigger race conditions.
* Memory Management: Attach a Redis `EXPIRE` TTL equal to the time required to refill an empty bucket so inactive client keys evict automatically.

Key Performance Indicators (KPIs) to Track:

* P99 Limiter Latency: Keep rate-check overhead below `2.0 ms`.
* HTTP 429 Throttle Ratio: Monitor rejected requests as a percentage of total traffic (investigate spikes above `1.5%`).
* Downstream Availability: Maintain `99.99%` uptime on core database and compute tiers during peak load.



Practical Takeaway: 

Never expose authentication, search, or payment endpoints without a rate limiter. Tune bucket capacity (`cap`) to match the maximum burst your slowest dependency can safely absorb.

Which rate limiting algorithm do you run in production: Token Bucket, Leaky Bucket, or Sliding Window?
