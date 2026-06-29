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

async function upsert(uid: typeof orderUid | typeof invitationUid | typeof callbackUid, externalId: string, data: Record<string, any>) {
  if (!externalId) return;
  const query = strapi.db.query(uid);
  const existing = await query.findOne({ where: { externalId } });
  if (existing) {
    await query.update({ where: { id: existing.id }, data });
    return;
  }
  await query.create({ data });
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

export async function writeStore(store: PaymentStore) {
  for (const invitation of Array.isArray(store.invitations) ? store.invitations : []) {
    const data = invitationToStrapi(invitation);
    await upsert(invitationUid, data.externalId, data);
  }
  for (const order of Array.isArray(store.orders) ? store.orders : []) {
    const data = orderToStrapi(order);
    await upsert(orderUid, data.externalId, data);
  }
  for (const callback of Array.isArray(store.callbacks) ? store.callbacks : []) {
    const data = callbackToStrapi(callback);
    await upsert(callbackUid, data.externalId, data);
  }
}

let writeChain = Promise.resolve();

export function updateStore(mutator: (store: PaymentStore) => unknown | Promise<unknown>) {
  const run = async () => {
    const store = await readStore();
    const result = await mutator(store);
    await writeStore(store);
    return result;
  };
  const next = writeChain.then(run, run);
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
