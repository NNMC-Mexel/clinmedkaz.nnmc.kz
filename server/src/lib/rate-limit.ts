export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = { count: number; resetAt: number };

export function createRateLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  function check(key: string, limit: number, windowMs: number): RateLimitResult {
    const timestamp = now();
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= timestamp
      ? { count: 0, resetAt: timestamp + windowMs }
      : existing;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= timestamp) buckets.delete(bucketKey);
      }
    }

    return {
      allowed: bucket.count <= limit,
      limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000)),
    };
  }

  return { check };
}
