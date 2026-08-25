import { createRateLimiter } from '../lib/rate-limit';

const limiter = createRateLimiter();

const rules = [
  { id: 'login', method: 'POST', path: /^\/api\/auth\/local$/, limit: 10, windowMs: 60_000 },
  { id: 'create-payment', method: 'POST', path: /^\/api\/payments$/, limit: 20, windowMs: 60_000 },
  { id: 'payment-object', method: 'GET', path: /^\/api\/payments\/[^/]+\/payment-object$/, limit: 20, windowMs: 60_000 },
  { id: 'reconcile', method: 'POST', path: /^\/api\/payments\/[^/]+\/reconcile$/, limit: 12, windowMs: 60_000 },
];

export default (_config: unknown, _context: unknown) => async (ctx: any, next: () => Promise<void>) => {
  const rule = rules.find((candidate) => candidate.method === ctx.method && candidate.path.test(ctx.path));
  if (!rule) return next();

  const result = limiter.check(`${rule.id}:${ctx.ip || 'unknown'}`, rule.limit, rule.windowMs);
  ctx.set('X-RateLimit-Limit', String(result.limit));
  ctx.set('X-RateLimit-Remaining', String(result.remaining));
  if (!result.allowed) {
    ctx.set('Retry-After', String(result.retryAfterSeconds));
    ctx.status = 429;
    ctx.body = {
      data: null,
      error: {
        status: 429,
        name: 'TooManyRequestsError',
        message: 'Too many requests. Please try again later.',
      },
    };
    return;
  }
  return next();
};
