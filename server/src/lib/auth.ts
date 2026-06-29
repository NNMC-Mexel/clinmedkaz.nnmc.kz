import crypto from 'node:crypto';
import { config } from './config';
import { cleanText, timingSafeEqualText } from './domain';
import { logger } from './logger';

const cookieName = 'clinmed_admin_session';

function signSessionPayload(payload: Record<string, any>) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', config.adminSessionSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySessionCookie(value: unknown) {
  const [body, signature] = String(value || '').split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', config.adminSessionSecret).update(body).digest('base64url');
  if (!timingSafeEqualText(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.username || !payload.expiresAt || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

export function adminSession(ctx: any) {
  return verifySessionCookie(ctx.cookies.get(cookieName));
}

export function setAdminSessionCookie(ctx: any, payload: Record<string, any>) {
  const value = signSessionPayload({ ...payload, expiresAt: Date.now() + config.adminSessionTtlMs });
  ctx.cookies.set(cookieName, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: config.adminSessionTtlMs,
  });
}

export function clearAdminSessionCookie(ctx: any) {
  ctx.cookies.set(cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: 0,
  });
}

export function requireAdmin(ctx: any) {
  const session = adminSession(ctx);
  if (session) return session.username || 'admin';
  const token = ctx.get('x-admin-token') || ctx.query?.token;
  if (config.adminToken && token && timingSafeEqualText(token, config.adminToken)) return 'api-token';
  ctx.throw(401, 'Unauthorized');
}

export async function authenticateAdmin(usernameInput: unknown, passwordInput: unknown) {
  const username = cleanText(usernameInput, 160);
  const password = String(passwordInput || '');

  for (const account of config.adminAccounts) {
    const ok = timingSafeEqualText(username, account.username) && timingSafeEqualText(password, account.password);
    if (ok) return { username: account.username, source: 'env', role: 'env-admin' };
  }

  try {
    const response = await fetch(`${config.backendUrl.replace(/\/$/, '')}/api/auth/local`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: username, password }),
    });
    if (!response.ok) return null;
    const payload: any = await response.json().catch(() => ({}));
    if (!payload?.jwt) return null;
    return { username: payload.user?.username || username, source: 'strapi', role: null };
  } catch (error) {
    logger.warn('Strapi user auth fallback failed', { error: (error as Error).message });
    return null;
  }
}
