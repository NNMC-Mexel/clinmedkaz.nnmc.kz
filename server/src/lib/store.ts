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
    country: row.country || '',
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
    country: row.country || '',
    articleTitle: row.articleTitle,
    lang: row.lang,
    publicationFeeUsd: row.publicationFeeUsd === null ? null : Number(row.publicationFeeUsd),
    usdToKztRate: row.usdToKztRate === null ? null : Number(row.usdToKztRate),
    residentAmount: row.residentAmount === null ? null : Number(row.residentAmount),
    residentCurrency: row.residentCurrency || '',
    nonResidentAmount: row.nonResidentAmount === null ? null : Number(row.nonResidentAmount),
    nonResidentCurrency: row.nonResidentCurrency || '',
    customAmount: cleanNumber(row.customAmount),
    customCurrency: row.customCurrency || '',
    createdAt: row.invitationCreatedAt,
    updatedAt: row.invitationUpdatedAt,
    firstOpenedAt: row.firstOpenedAt || null,
    lastOpenedAt: row.lastOpenedAt || null,
    openCount: Number(row.openCount) || 0,
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
    country: cleanString(order.country),
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
    country: cleanString(invitation.country),
    articleTitle: cleanString(invitation.articleTitle),
    lang: cleanString(invitation.lang, 'ru'),
    publicationFeeUsd: cleanNumber(invitation.publicationFeeUsd),
    usdToKztRate: cleanNumber(invitation.usdToKztRate),
    residentAmount: cleanNumber(invitation.residentAmount),
    residentCurrency: cleanString(invitation.residentCurrency),
    nonResidentAmount: cleanNumber(invitation.nonResidentAmount),
    nonResidentCurrency: cleanString(invitation.nonResidentCurrency),
    customAmount: cleanNumber(invitation.customAmount),
    customCurrency: cleanString(invitation.customCurrency),
    invitationCreatedAt: iso(invitation.createdAt),
    invitationUpdatedAt: iso(invitation.updatedAt),
    // firstOpenedAt / lastOpenedAt / openCount are owned by recordInvitationOpen and never
    // written here, so a store transaction cannot overwrite a newer open with a stale copy.
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
  // One conditional UPDATE, not query.update(): Strapi's update() selects the row first and then
  // updates it by id, so under Postgres READ COMMITTED two transactions could both pass the version
  // check (seen as duplicate orders for one link). A single UPDATE ... WHERE version = ? is
  // re-evaluated by Postgres after the row lock is released, so the loser updates 0 rows and retries.
  const { count } = await query.updateMany({ where: { externalId, [versionField]: version }, data });
  if (!count) throw new ConcurrentStoreUpdateError();
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
  // Sequential on purpose, invitations first. Under Postgres READ COMMITTED each statement sees
  // the latest commit, so reading orders first could miss an order whose invitation change is
  // already visible - and then nothing would trip the invitation version check. Reading the
  // invitation first means a stale invitation fails the version check and a fresh one comes
  // with its orders.
  const invitations = await strapi.db.query(invitationUid).findMany({ orderBy: { invitationCreatedAt: 'desc' } });
  const orders = await strapi.db.query(orderUid).findMany({ orderBy: { paymentCreatedAt: 'desc' } });
  const callbacks = await strapi.db.query(callbackUid).findMany({ orderBy: { receivedAt: 'desc' } });

  return {
    invitations: invitations.map(invitationToStore),
    orders: orders.map(orderToStore),
    callbacks: callbacks.map(callbackToStore),
    auditLog: [],
  };
}

export async function readOrdersPage(options: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const page = Math.max(1, Math.floor(Number(options.page) || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(options.pageSize) || 20)));
  const query = cleanString(options.query).slice(0, 120).toLocaleLowerCase();
  const status = cleanString(options.status);
  const fromText = cleanString(options.dateFrom);
  const toText = cleanString(options.dateTo);
  const parsedFrom = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(fromText) ? `${fromText}T00:00:00.000Z` : fromText);
  const parsedTo = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(toText) ? `${toText}T00:00:00.000Z` : toText);
  const dateFrom = Number.isFinite(parsedFrom) ? parsedFrom : null;
  const dateTo = Number.isFinite(parsedTo) ? parsedTo + (/^\d{4}-\d{2}-\d{2}$/.test(toText) ? 86_400_000 : 0) : null;
  const [orderRows, invitationRows] = await Promise.all([
    strapi.db.query(orderUid).findMany({ orderBy: { paymentCreatedAt: 'desc' } }),
    strapi.db.query(invitationUid).findMany({ orderBy: { invitationCreatedAt: 'desc' } }),
  ]);
  const opensByInvitation = new Map(
    invitationRows.map((row: Record<string, any>) => [row.externalId, invitationToStore(row)])
  );
  // Orders inherit the link's open history, so a failed or abandoned payment still shows
  // whether the author came back to the link.
  const orders = orderRows.map(orderToStore).map((order) => {
    const invitation = order.invitationId ? opensByInvitation.get(order.invitationId) : null;
    return {
      ...order,
      recordType: 'order',
      firstOpenedAt: invitation?.firstOpenedAt || null,
      lastOpenedAt: invitation?.lastOpenedAt || null,
      openCount: invitation?.openCount || 0,
    };
  });
  const invitationIdsWithOrders = new Set(orders.map((order) => order.invitationId).filter(Boolean));
  const invitations = invitationRows
    .map(invitationToStore)
    .filter((invitation) => !invitationIdsWithOrders.has(invitation.id))
    .map((invitation) => ({
      ...invitation,
      recordType: 'invitation',
      invitationId: invitation.id,
      invoiceId: '',
      // "Opened" is display-only: the stored status machine (created -> payment_started -> paid) is untouched.
      status: invitation.status === 'created' ? (invitation.openCount > 0 ? 'invitation_opened' : 'invitation_created') : invitation.status,
      amount: invitation.customAmount || invitation.residentAmount,
      currency: invitation.customCurrency || invitation.residentCurrency || 'KZT',
      residency: '',
    }));
  const entries = [...orders, ...invitations]
    .filter((entry) => !status || status === 'all' || entry.status === status)
    .filter((entry) => {
      if (!query) return true;
      return [entry.invoiceId, entry.id, entry.fullName, entry.email, entry.articleTitle, entry.country]
        .some((value) => cleanString(value).toLocaleLowerCase().includes(query));
    })
    .filter((entry) => {
      const timestamp = Date.parse(entry.createdAt);
      return Number.isFinite(timestamp) && (dateFrom === null || timestamp >= dateFrom) && (dateTo === null || timestamp < dateTo);
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const total = entries.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(page, pageCount);
  const offset = (resolvedPage - 1) * pageSize;
  return {
    orders: entries.slice(offset, offset + pageSize),
    pagination: { page: resolvedPage, pageSize, total, pageCount },
  };
}

// Link-open tracking is a public, high-frequency write, so it bypasses updateStore: one
// atomic row update, no full-store read, and no bump of the invitation version that payment
// creation relies on for optimistic locking.
export async function recordInvitationOpen(externalId: string): Promise<'recorded' | 'ignored' | 'missing'> {
  const row = await strapi.db.query(invitationUid).findOne({
    where: { externalId },
    select: ['id', 'status', 'firstOpenedAt'],
  });
  if (!row) return 'missing';
  if (['paid', 'cancelled'].includes(row.status)) return 'ignored';
  const meta = strapi.db.metadata.get(invitationUid);
  const column = (attribute: string) => (meta.attributes[attribute] as any)?.columnName || attribute;
  await strapi.db
    .connection(meta.tableName)
    .where({ id: row.id })
    .whereNotIn(column('status'), ['paid', 'cancelled'])
    .update({ [column('openCount')]: strapi.db.connection.raw(`COALESCE(??, 0) + 1`, [column('openCount')]) });
  const now = new Date();
  await strapi.db.query(invitationUid).update({
    where: { id: row.id },
    data: { lastOpenedAt: now, ...(row.firstOpenedAt ? {} : { firstOpenedAt: now }) },
  });
  return 'recorded';
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
