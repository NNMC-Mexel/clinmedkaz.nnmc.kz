import crypto from 'node:crypto';
import { withRequestContext } from '../lib/request-context';

const safeRequestId = /^[a-zA-Z0-9_-]{8,100}$/;

export default (_config: unknown, _context: unknown) => async (ctx: any, next: () => Promise<void>) => {
  const supplied = String(ctx.get('X-Request-Id') || '');
  const requestId = safeRequestId.test(supplied) ? supplied : crypto.randomUUID();
  ctx.state.requestId = requestId;
  ctx.set('X-Request-Id', requestId);
  return withRequestContext({ requestId }, next);
};
