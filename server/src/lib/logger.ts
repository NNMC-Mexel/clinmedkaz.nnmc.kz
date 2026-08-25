import { config } from './config';
import { currentRequestId } from './request-context';

const sensitiveKey = /authorization|cookie|password|secret|token/i;

export function redactMeta(value: unknown, key = ''): unknown {
  if (sensitiveKey.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => redactMeta(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redactMeta(child, childKey)]));
  }
  return value;
}

function emit(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown> = {}) {
  const safeMeta = redactMeta(meta) as Record<string, unknown>;
  const requestId = currentRequestId();
  const record = { ts: new Date().toISOString(), level, message, ...(requestId ? { requestId } : {}), ...safeMeta };
  if (config.isProduction) {
    const line = JSON.stringify(record);
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
    return;
  }
  const suffix = Object.keys(safeMeta).length ? ` ${JSON.stringify(safeMeta)}` : '';
  const text = `[${level}]${requestId ? ` [${requestId}]` : ''} ${message}${suffix}`;
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.info(text);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
