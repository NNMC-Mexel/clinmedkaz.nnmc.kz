import { config } from './config';

export const PAYMENTS_DISABLED_MESSAGE = 'Payments are temporarily unavailable.';

export function requirePaymentsEnabled(ctx: any) {
  if (config.payments.enabled) return true;
  ctx.status = 503;
  ctx.body = {
    error: {
      status: 503,
      name: 'ServiceUnavailableError',
      message: PAYMENTS_DISABLED_MESSAGE,
      details: { code: 'PAYMENTS_DISABLED' },
    },
  };
  return false;
}
