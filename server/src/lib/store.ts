const orderUid = 'api::order.order' as const;
const invitationUid = 'api::invitation.invitation' as const;
const callbackUid = 'api::payment-callback.payment-callback' as const;

export type PaymentStore = {
  invitations: Record<string, any>[];
  orders: Record<string, any>[];
  callbacks: Record<string, any>[];
  auditLog?: Record<string, any>[];
};

function iso(value: unknown) {
  const date = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function cleanString(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function orderToStore(row: Record<string, any>) {
  return {
    id: row.externalId,
    invoiceId: row.invoiceId,
    secretHash: row.secretHash,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    publicationFeeUsd: row.publicationFeeUsd === null ? null : Number(row.publicationFeeUsd),
    exchangeRate: row.exchangeRate === null ? null : Number(row.exchangeRate),
    residency: row.residency,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone || '',
    articleTitle: row.articleTitle,
    lang: row.lang,
    invitationId: row.invitationId || null,
    createdAt: row.paymentCreatedAt,
    updatedAt: row.paymentUpdatedAt,
    postbacks: Array.isArray(row.postbacks) ? row.postbacks : [],
    halykReference: row.halykReference || '',
    cardMask: row.cardMask || '',
    reason: row.reason || '',
    paymentReceivedAt: row.paymentReceivedAt || null,
    publicationStatus: row.publicationStatus || 'pending_payment',
    publishedAt: row.publishedAt || null,
    articleUrl: row.articleUrl || '',
    doi: row.doi || '',
    refundStatus: row.refundStatus || 'none',
    refundReason: row.refundReason || '',
    accountingStatus: row.accountingStatus || 'new',
    adminComment: row.adminComment || '',
  };
}

export function invitationToStore(row: Record<string, any>) {
  return {
    id: row.externalId,
    status: row.status,
    email: row.email,
    fullName: row.fullName || '',
    phone: row.phone || '',
    articleTitle: row.articleTitle,
    lang: row.lang,
    publicationFeeUsd: row.publicationFeeUsd === null ? null : Number(row.publicationFeeUsd),
    usdToKztRate: row.usdToKztRate === null ? null : Number(row.usdToKztRate),
    residentAmount: row.residentAmount === null ? null : Number(row.residentAmount),
    residentCurrency: row.residentCurrency || '',
    nonResidentAmount: row.nonResidentAmount === null ? null : Number(row.nonResidentAmount),
    nonResidentCurrency: row.nonResidentCurrency || '',
    createdAt: row.invitationCreatedAt,
    updatedAt: row.invitationUpdatedAt,
  };
}

export function callbackToStore(row: Record<string, any>) {
  return {
    id: row.externalId,
    invoiceId: row.invoiceId || '',
    matchedOrderId: row.matchedOrderId || '',
    matched: Boolean(row.matched),
    secretMatches: Boolean(row.secretMatches),
    amountChecked: Boolean(row.amountChecked),
    amountOk: Boolean(row.amountOk),
    code: row.code || '',
    reference: row.reference || '',
    payload: row.payload || {},
    receivedAt: row.receivedAt,
  };
}

function orderToStrapi(order: Record<string, any>) {
  return {
    externalId: cleanString(order.id),
    invoiceId: cleanString(order.invoiceId),
    secretHash: cleanString(order.secretHash),
    status: cleanString(order.status, 'created'),
    amount: cleanNumber(order.amount) ?? 0,
    currency: cleanString(order.currency, 'KZT'),
    publicationFeeUsd: cleanNumber(order.publicationFeeUsd),
    exchangeRate: cleanNumber(order.exchangeRate),
    residency: cleanString(order.residency, 'resident_kz'),
    fullName: cleanString(order.fullName),
    email: cleanString(order.email).toLowerCase(),
    phone: cleanString(order.phone),
    articleTitle: cleanString(order.articleTitle),
    lang: cleanString(order.lang, 'ru'),
    invitationId: order.invitationId ? cleanString(order.invitationId) : null,
    halykReference: cleanString(order.halykReference),
    cardMask: cleanString(order.cardMask),
    reason: cleanString(order.reason),
    paymentReceivedAt: order.paymentReceivedAt ? iso(order.paymentReceivedAt) : null,
    publicationStatus: cleanString(order.publicationStatus, 'pending_payment'),
    publishedAt: order.publishedAt ? iso(order.publishedAt) : null,
    articleUrl: cleanString(order.articleUrl),
    doi: cleanString(order.doi),
    refundStatus: cleanString(order.refundStatus, 'none'),
    refundReason: cleanString(order.refundReason),
    accountingStatus: cleanString(order.accountingStatus, 'new'),
    adminComment: cleanString(order.adminComment),
    postbacks: Array.isArray(order.postbacks) ? order.postbacks : [],
    paymentCreatedAt: iso(order.createdAt),
    paymentUpdatedAt: iso(order.updatedAt),
  };
}

function invitationToStrapi(invitation: Record<string, any>) {
  return {
    externalId: cleanString(invitation.id),
    status: cleanString(invitation.status, 'created'),
    email: cleanString(invitation.email).toLowerCase(),
    fullName: cleanString(invitation.fullName),
    phone: cleanString(invitation.phone),
    articleTitle: cleanString(invitation.articleTitle),
    lang: cleanString(invitation.lang, 'ru'),
    publicationFeeUsd: cleanNumber(invitation.publicationFeeUsd),
    usdToKztRate: cleanNumber(invitation.usdToKztRate),
    residentAmount: cleanNumber(invitation.residentAmount),
    residentCurrency: cleanString(invitation.residentCurrency),
    nonResidentAmount: cleanNumber(invitation.nonResidentAmount),
    nonResidentCurrency: cleanString(invitation.nonResidentCurrency),
    invitationCreatedAt: iso(invitation.createdAt),
    invitationUpdatedAt: iso(invitation.updatedAt),
  };
}

function callbackToStrapi(callback: Record<string, any>) {
  return {
    externalId: cleanString(callback.id),
    invoiceId: cleanString(callback.invoiceId),
    matchedOrderId: cleanString(callback.matchedOrderId),
    matched: Boolean(callback.matched),
    secretMatches: Boolean(callback.secretMatches),
    amountChecked: Boolean(callback.amountChecked),
    amountOk: Boolean(callback.amountOk),
    code: cleanString(callback.code),
    reference: cleanString(callback.reference),
    payload: callback.payload && typeof callback.payload === 'object' ? callback.payload : {},
    receivedAt: iso(callback.receivedAt),
  };
}

class ConcurrentStoreUpdateError extends Error {
  constructor() {
    super('Concurrent payment store update detected.');
    this.name = 'ConcurrentStoreUpdateError';
  }
}

function isRetryableStoreError(error: unknown) {
  if (error instanceof ConcurrentStoreUpdateError) return true;
  const code = String((error as { code?: unknown })?.code || '');
  return ['SQLITE_BUSY', '40001', '40P01'].includes(code);
}

function changed(before: Record<string, any> | undefined, after: Record<string, any>) {
  return !before || JSON.stringify(before) !== JSON.stringify(after);
}

async function persistVersioned(
  uid: typeof orderUid | typeof invitationUid,
  externalId: string,
  data: Record<string, any>,
  before: Record<string, any> | undefined,
  versionField: 'paymentUpdatedAt' | 'invitationUpdatedAt'
) {
  const query = strapi.db.query(uid);
  if (!before) {
    await query.create({ data });
    return;
  }
  const version = before.updatedAt;
  const updated = await query.update({ where: { externalId, [versionField]: version }, data });
  if (!updated) throw new ConcurrentStoreUpdateError();
}

async function persistStoreDiff(before: PaymentStore, after: PaymentStore) {
  const invitationsBefore = new Map(before.invitations.map((item) => [item.id, item]));
  const ordersBefore = new Map(before.orders.map((item) => [item.id, item]));
  const callbacksBefore = new Set(before.callbacks.map((item) => item.id));

  // Invitations are persisted first. A concurrent payment creation changes the invitation
  // version, so the whole transaction retries before a second order can be inserted.
  for (const invitation of after.invitations) {
    const previous = invitationsBefore.get(invitation.id);
    if (!changed(previous, invitation)) continue;
    await persistVersioned(
      invitationUid,
      invitation.id,
      invitationToStrapi(invitation),
      previous,
      'invitationUpdatedAt'
    );
  }
  for (const order of after.orders) {
    const previous = ordersBefore.get(order.id);
    if (!changed(previous, order)) continue;
    await persistVersioned(orderUid, order.id, orderToStrapi(order), previous, 'paymentUpdatedAt');
  }
  for (const callback of after.callbacks) {
    if (callbacksBefore.has(callback.id)) continue;
    await strapi.db.query(callbackUid).create({ data: callbackToStrapi(callback) });
  }
}

export async function readStore(): Promise<PaymentStore> {
  const [orders, invitations, callbacks] = await Promise.all([
    strapi.db.query(orderUid).findMany({ orderBy: { paymentCreatedAt: 'desc' } }),
    strapi.db.query(invitationUid).findMany({ orderBy: { invitationCreatedAt: 'desc' } }),
    strapi.db.query(callbackUid).findMany({ orderBy: { receivedAt: 'desc' } }),
  ]);

  return {
    invitations: invitations.map(invitationToStore),
    orders: orders.map(orderToStore),
    callbacks: callbacks.map(callbackToStore),
    auditLog: [],
  };
}

export async function readOrdersPage(options: { page?: number; pageSize?: number; query?: string; status?: string } = {}) {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(options.pageSize) || 20)));
  const query = cleanString(options.query).slice(0, 120);
  const status = cleanString(options.status);
  const where: Record<string, any> = {};
  if (status && status !== 'all') where.status = status;
  if (query) {
    where.$or = ['invoiceId', 'fullName', 'email', 'articleTitle'].map((field) => ({
      [field]: { $containsi: query },
    }));
  }
  const orderQuery = strapi.db.query(orderUid);
  const [rows, total] = await Promise.all([
    orderQuery.findMany({
      where,
      orderBy: { paymentCreatedAt: 'desc' },
      offset: (page - 1) * pageSize,
      limit: pageSize,
    }),
    orderQuery.count({ where }),
  ]);
  return {
    orders: rows.map(orderToStore),
    pagination: { page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function readActiveOrderIds(statuses: string[], limit = 100) {
  const rows = await strapi.db.query(orderUid).findMany({
    select: ['externalId'],
    where: { status: { $in: statuses } },
    orderBy: { paymentUpdatedAt: 'asc' },
    limit: Math.min(500, Math.max(1, limit)),
  });
  return rows.map((row: Record<string, any>) => row.externalId).filter(Boolean);
}

export async function updateStore<T>(mutator: (store: PaymentStore) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await strapi.db.transaction(async () => {
        const before = await readStore();
        const store = structuredClone(before);
        const result = await mutator(store);
        await persistStoreDiff(before, store);
        return result;
      });
    } catch (error) {
      if (!isRetryableStoreError(error) || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
  throw new ConcurrentStoreUpdateError();
}
