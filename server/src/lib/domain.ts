import crypto from 'node:crypto';
import { errors } from '@strapi/utils';

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

export function fail(message: string) {
  return new errors.ValidationError(message);
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

type PricingLike = {
  residentKztAmount: number;
  usdToKztRate: number;
  residentCurrency: string;
  nonResidentAmount: number;
  nonResidentCurrency: string;
  publicationFeeUsd: number;
};

// Frozen onto the invitation so a later price change never moves the amount of a link
// that has already been sent to an author.
export function invitationPricingSnapshot(pricing: PricingLike) {
  return {
    publicationFeeUsd: pricing.publicationFeeUsd,
    usdToKztRate: pricing.usdToKztRate,
    residentAmount: pricing.residentKztAmount,
    residentCurrency: pricing.residentCurrency,
    nonResidentAmount: pricing.nonResidentAmount,
    nonResidentCurrency: pricing.nonResidentCurrency,
  };
}

export function calculateOrderPrice(residency: string, invitation: Record<string, any>, pricing: PricingLike) {
  if (residency === 'non_resident') {
    return {
      amount: Number(invitation.nonResidentAmount || pricing.nonResidentAmount),
      currency: invitation.nonResidentCurrency || pricing.nonResidentCurrency,
      exchangeRate: null,
    };
  }
  return {
    amount: Number(invitation.residentAmount || pricing.residentKztAmount),
    currency: invitation.residentCurrency || pricing.residentCurrency,
    exchangeRate: Number(invitation.usdToKztRate || pricing.usdToKztRate),
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
  // Phone is optional for an invitation, but when supplied it is stored as digits only.
  const phone = cleanText(input.phone, 80).replace(/\D/g, '');
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
    return { checked: false, ok: false };
  }
  if (Number(payload.amount) !== Number(order.amount)) return { checked: true, ok: false };
  if (!payload.currency || String(payload.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    return { checked: true, ok: false };
  }
  return { checked: true, ok: true };
}

function terminalFromPayload(payload: Record<string, any>) {
  return cleanText(payload.terminalID || payload.terminalId || payload.terminal, 160);
}

export function sanitizePostlinkPayload(payload: Record<string, any>) {
  const sanitized = {
    invoiceId: cleanText(payload.invoiceId || payload.invoiceID, 80),
    amount: payload.amount === undefined ? null : Number(payload.amount),
    currency: cleanText(payload.currency, 8).toUpperCase(),
    terminalID: terminalFromPayload(payload),
    code: cleanText(payload.code, 40),
    reference: cleanText(payload.reference, 160),
    reason: cleanText(payload.reason, 300),
    cardMask: cleanText(payload.cardMask, 32),
  };
  return Object.fromEntries(
    Object.entries(sanitized).filter(([, value]) => value !== '' && value !== null && !(typeof value === 'number' && !Number.isFinite(value)))
  );
}

export function evaluatePostlink(order: Record<string, any> | null, payload: Record<string, any>, expectedTerminalId = '') {
  if (!order) return { action: 'no_order', secretMatches: false, amount: { checked: false, ok: false } };
  const secretMatches = Boolean(payload.secret_hash) && timingSafeEqualText(payload.secret_hash, order.secretHash);
  const amount = amountMatches(order, payload);
  const terminalMatches = !expectedTerminalId || timingSafeEqualText(terminalFromPayload(payload), expectedTerminalId);
  if (order.status === 'paid') return { action: 'already_paid', secretMatches, amount };
  if (!secretMatches) return { action: 'reject_secret', secretMatches: false, amount };
  if (!terminalMatches) return { action: 'reject_terminal', secretMatches: true, amount };
  if (!amount.ok) return { action: 'reject_amount', secretMatches: true, amount };
  return { action: String(payload.code) === 'ok' ? 'paid' : 'failed', secretMatches: true, amount };
}

export function evaluateHalykTransaction(
  order: Record<string, any>,
  response: Record<string, any>,
  expectedTerminalId: string
) {
  const transaction = response?.transaction;
  if (String(response?.resultCode || '') !== '100' || !transaction) {
    return { action: 'pending', reason: cleanText(response?.resultMessage || 'not_found', 200) };
  }

  const invoiceId = cleanText(transaction.invoiceID || transaction.invoiceId, 80);
  if (invoiceId !== String(order.invoiceId)) return { action: 'reject', reason: 'invoice_mismatch' };
  if (!amountMatches(order, transaction).ok) return { action: 'reject', reason: 'amount_or_currency_mismatch' };
  if (expectedTerminalId && !timingSafeEqualText(terminalFromPayload(transaction), expectedTerminalId)) {
    return { action: 'reject', reason: 'terminal_mismatch' };
  }

  const statusName = cleanText(transaction.statusName || transaction.status, 40).toUpperCase();
  if (statusName === 'CHARGE') return { action: 'paid', reason: '' };
  if (statusName === 'REFUND') return { action: 'refunded', reason: 'bank_refund' };
  if (['FAILED', 'REJECT', 'CANCEL', 'CANCEL_OLD', '3D'].includes(statusName)) {
    return { action: 'failed', reason: cleanText(transaction.reason || statusName, 200) };
  }
  return { action: 'pending', reason: statusName || 'in_progress' };
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
