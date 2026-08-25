import crypto from 'node:crypto';
import { config } from './config';

const scope = 'webapi usermanagement email_send verification statement statistics payment';
export const POSTLINK_PATH = '/api/halyk/postlink';
let statusTokenCache: { token: string; expiresAt: number } | null = null;

export function makeSecretHash() {
  return crypto.randomBytes(24).toString('base64url');
}

export function makeInvoiceId() {
  const now = Date.now().toString().slice(-13);
  const suffix = crypto.randomInt(10, 99).toString();
  return `${now}${suffix}`.slice(-15);
}

export function postLinkUrl() {
  return new URL(POSTLINK_PATH, config.backendUrl).toString();
}

export async function getPaymentToken({ invoiceId, secretHash, amount, currency, postLink, failurePostLink }) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope,
    client_id: config.halyk.clientId,
    client_secret: config.halyk.clientSecret,
    invoiceID: invoiceId,
    secret_hash: secretHash,
    amount: String(amount),
    currency,
    terminal: config.halyk.terminalId,
    postLink,
    failurePostLink,
  });

  const response = await fetch(config.halyk.oauthUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const reason = payload.error_description || payload.error || response.statusText;
    throw new Error(`Halyk token request failed: ${reason}`);
  }

  return payload;
}

async function getStatusToken() {
  if (statusTokenCache && statusTokenCache.expiresAt > Date.now() + 30_000) return statusTokenCache.token;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope,
    client_id: config.halyk.clientId,
    client_secret: config.halyk.clientSecret,
    terminal: config.halyk.terminalId,
  });
  const response = await fetch(config.halyk.oauthUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    const reason = payload.error_description || payload.error || response.statusText;
    throw new Error(`Halyk status token request failed: ${reason}`);
  }
  statusTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(60, Number(payload.expires_in || 300)) * 1000,
  };
  return statusTokenCache.token;
}

export async function getHalykTransactionStatus(invoiceId: string) {
  const token = await getStatusToken();
  const response = await fetch(`${config.halyk.statusUrl}/${encodeURIComponent(invoiceId)}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Halyk status request failed: ${response.status} ${response.statusText}`);
  return payload;
}

export function makePaymentObject({ order, auth }) {
  const postLink = postLinkUrl();
  const lang = ['ru', 'kk', 'en'].includes(order.lang) ? order.lang : 'ru';
  return {
    invoiceId: order.invoiceId,
    invoiceIdAlt: order.id,
    backLink: `${config.baseUrl}/payment/success/${order.id}?lang=${lang}`,
    failureBackLink: `${config.baseUrl}/payment/failure/${order.id}?lang=${lang}`,
    autoBackLink: true,
    postLink,
    failurePostLink: postLink,
    language: halykLanguage(lang),
    description: 'ClinMedKaz article publication',
    accountId: order.email,
    terminal: config.halyk.terminalId,
    amount: order.amount,
    currency: order.currency,
    phone: order.phone,
    name: toLatinName(order.fullName),
    email: order.email,
    data: JSON.stringify({
      statement: {
        name: order.fullName,
        invoiceID: order.invoiceId,
        articleTitle: order.articleTitle,
      },
    }),
    auth,
  };
}

function halykLanguage(lang: string) {
  if (lang === 'kk') return 'kaz';
  if (lang === 'en') return 'eng';
  return 'rus';
}

function toLatinName(value: unknown) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^A-Za-z\s.'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}
