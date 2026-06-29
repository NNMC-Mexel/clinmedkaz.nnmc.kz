import { config } from './config';

function emit(level: 'info' | 'warn' | 'error', message: string, meta: Record<string, unknown> = {}) {
  const record = { ts: new Date().toISOString(), level, message, ...meta };
  if (config.isProduction) {
    const line = JSON.stringify(record);
    if (level === 'error' || level === 'warn') console.error(line);
    else console.log(line);
    return;
  }
  const suffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const text = `[${level}] ${message}${suffix}`;
  if (level === 'error') console.error(text);
  else if (level === 'warn') console.warn(text);
  else console.info(text);
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
