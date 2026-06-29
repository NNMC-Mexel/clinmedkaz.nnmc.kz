import crypto from 'node:crypto';
import { config } from './config';

export const SUPPORTED_LANGUAGES = ['ru', 'kk', 'en'];
export const ORDER_ACTIVE_STATUSES = ['created', 'token_issued'];
export const ORDER_CLOSED_STATUSES = ['failed', 'postlink_rejected', 'cancelled', 'refunded'];
export const PUBLICATION_STATUSES = ['pending_payment', 'ready_to_publish', 'published', 'on_hold', 'cancelled'];
export const REFUND_STATUSES = ['none', 'requested', 'approved', 'rejected', 'processed'];
export const ACCOUNTING_STATUSES = ['new', 'reconciled', 'exported', 'disputed'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLanguage(lang: unknown) {
  return SUPPORTED_LANGUAGES.includes(String(lang)) ? String(lang) : 'ru';
}

export function cleanText(value: unknown, max = 500) {
  return String(value || '').trim().slice(0, max);
}

export function fail(message: string, status = 400) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

export function timingSafeEqualText(a: unknown, b: unknown) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function normalizeResidency(value: unknown) {
  return cleanText(value, 24) === 'non_resident' ? 'non_resident' : 'resident_kz';
}

export function invitationPricingSnapshot(cfg = config) {
  return {
    publicationFeeUsd: cfg.pricing.publicationFeeUsd,
    usdToKztRate: cfg.pricing.usdToKztRate,
    residentAmount: cfg.pricing.residentKztAmount,
    residentCurrency: cfg.pricing.residentCurrency,
    nonResidentAmount: cfg.pricing.nonResidentAmount,
    nonResidentCurrency: cfg.pricing.nonResidentCurrency,
  };
}

export function calculateOrderPrice(residency: string, invitation: Record<string, any>, cfg = config) {
  if (residency === 'non_resident') {
    return {
      amount: Number(invitation.nonResidentAmount || cfg.pricing.nonResidentAmount),
      currency: invitation.nonResidentCurrency || cfg.pricing.nonResidentCurrency,
      exchangeRate: null,
    };
  }
  return {
    amount: Number(invitation.residentAmount || cfg.pricing.residentKztAmount),
    currency: invitation.residentCurrency || cfg.pricing.residentCurrency,
    exchangeRate: Number(invitation.usdToKztRate || cfg.pricing.usdToKztRate),
  };
}

export function validateOrderInput(input: Record<string, any>) {
  const fullName = cleanText(input.fullName, 160);
  const email = cleanText(input.email, 160).toLowerCase();
  const phone = cleanText(input.phone, 80);
  const invitationId = cleanText(input.invitationId, 80);
  const lang = normalizeLanguage(cleanText(input.lang, 8));
  const residency = normalizeResidency(input.residency);

  if (fullName.length < 3) throw fail('Full name is required.');
  if (!EMAIL_RE.test(email)) throw fail('Valid email is required.');
  if (phone.length < 6) throw fail('Phone number is required.');
  if (!invitationId) throw fail('Payment link is required. Please use the link sent by the administrator.');

  return { fullName, email, phone, invitationId, lang, residency };
}

export function validateInvitationInput(input: Record<string, any>) {
  const email = cleanText(input.email, 160).toLowerCase();
  const fullName = cleanText(input.fullName, 160);
  const phone = cleanText(input.phone, 80);
  const articleTitle = cleanText(input.articleTitle, 500);
  const lang = normalizeLanguage(cleanText(input.lang, 8));

  if (!EMAIL_RE.test(email)) throw fail('Valid email is required.');
  if (articleTitle.length < 3) throw fail('Article title is required.');

  return { email, fullName, phone, articleTitle, lang };
}

export function activeOrderForInvitation(store: Record<string, any>, invitationId: string) {
  return store.orders.find((order) => order.invitationId === invitationId && ORDER_ACTIVE_STATUSES.includes(order.status));
}

export function paidOrderForInvitation(store: Record<string, any>, invitationId: string) {
  return store.orders.find((order) => order.invitationId === invitationId && order.status === 'paid');
}

export function amountMatches(order: Record<string, any>, payload: Record<string, any>) {
  if (payload.amount === undefined || payload.amount === null || payload.amount === '') {
    return { checked: false, ok: true };
  }
  if (Number(payload.amount) !== Number(order.amount)) return { checked: true, ok: false };
  if (payload.currency && String(payload.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    return { checked: true, ok: false };
  }
  return { checked: true, ok: true };
}

export function evaluatePostlink(order: Record<string, any> | null, payload: Record<string, any>) {
  if (!order) return { action: 'no_order', secretMatches: false, amount: { checked: false, ok: false } };
  const secretMatches = Boolean(payload.secret_hash) && timingSafeEqualText(payload.secret_hash, order.secretHash);
  const amount = amountMatches(order, payload);
  if (order.status === 'paid') return { action: 'already_paid', secretMatches, amount };
  if (!secretMatches) return { action: 'reject_secret', secretMatches: false, amount };
  if (!amount.ok) return { action: 'reject_amount', secretMatches: true, amount };
  return { action: String(payload.code) === 'ok' ? 'paid' : 'failed', secretMatches: true, amount };
}

const ORDER_FIELD_ENUMS = {
  publicationStatus: PUBLICATION_STATUSES,
  refundStatus: REFUND_STATUSES,
  accountingStatus: ACCOUNTING_STATUSES,
};

export function sanitizeOrderPatch(input: Record<string, any>) {
  const patch: Record<string, any> = {};
  for (const [field, values] of Object.entries(ORDER_FIELD_ENUMS)) {
    if (input[field] === undefined) continue;
    const value = cleanText(input[field], 40);
    if (!values.includes(value)) throw fail(`Invalid ${field}: ${value}`);
    patch[field] = value;
  }
  if (input.adminComment !== undefined) patch.adminComment = cleanText(input.adminComment, 2000);
  if (input.refundReason !== undefined) patch.refundReason = cleanText(input.refundReason, 2000);
  if (input.articleUrl !== undefined) patch.articleUrl = cleanText(input.articleUrl, 500);
  if (input.doi !== undefined) patch.doi = cleanText(input.doi, 120);
  if (patch.publicationStatus === 'published') patch.publishedAt = true;
  if (Object.keys(patch).length === 0) throw fail('No valid fields to update.');
  return patch;
}

export function refundOutcome(order: Record<string, any>, patch: Record<string, any>) {
  if (patch.refundStatus === 'processed' && order.status === 'paid') return 'refunded';
  return null;
}

export function normalizeTitle(title: unknown) {
  return cleanText(title, 500).toLowerCase().replace(/\s+/g, ' ');
}

export function isArticleAlreadyPaid(store: Record<string, any>, articleTitle: string, excludeInvitationId: string | null = null) {
  const norm = normalizeTitle(articleTitle);
  if (!norm) return false;
  return store.orders.some(
    (order) => order.status === 'paid' && order.invitationId !== excludeInvitationId && normalizeTitle(order.articleTitle) === norm
  );
}

export function findArticleDuplicates(store: Record<string, any>, articleTitle: string, excludeInvitationId: string | null = null) {
  const norm = normalizeTitle(articleTitle);
  if (!norm) return { paid: false, activeLinks: 0 };
  const paid = store.orders.some((order) => order.status === 'paid' && normalizeTitle(order.articleTitle) === norm);
  const activeLinks = (store.invitations || []).filter(
    (item) => item.id !== excludeInvitationId && item.status !== 'cancelled' && normalizeTitle(item.articleTitle) === norm
  ).length;
  return { paid, activeLinks };
}
