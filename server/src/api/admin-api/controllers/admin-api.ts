import { requireAdmin } from '../../../lib/auth';
import { refundOutcome, sanitizeOrderPatch } from '../../../lib/domain';
import { logger } from '../../../lib/logger';
import { readPricing, savePricing } from '../../../lib/pricing';
import { reconcileActiveOrders } from '../../../lib/reconciliation';
import { readOrdersPage, readStore, updateStore } from '../../../lib/store';

function nowIso() {
  return new Date().toISOString();
}

function orderSummary(order: Record<string, any>) {
  return {
    id: order.id,
    recordType: order.recordType || 'order',
    invoiceId: order.invoiceId,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    publicationFeeUsd: order.publicationFeeUsd,
    exchangeRate: order.exchangeRate,
    residency: order.residency,
    fullName: order.fullName,
    email: order.email,
    phone: order.phone,
    country: order.country || '',
    lang: order.lang || 'ru',
    articleTitle: order.articleTitle,
    invitationId: order.invitationId || null,
    paymentReceivedAt: order.paymentReceivedAt || null,
    publicationStatus: order.publicationStatus || 'pending_payment',
    publishedAt: order.publishedAt || null,
    articleUrl: order.articleUrl || '',
    doi: order.doi || '',
    refundStatus: order.refundStatus || 'none',
    refundReason: order.refundReason || '',
    refundedAt: order.refundedAt || null,
    accountingStatus: order.accountingStatus || 'new',
    adminComment: order.adminComment || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    halykReference: order.halykReference || '',
    cardMask: order.cardMask || '',
    reason: order.reason || '',
    postbacks: Array.isArray(order.postbacks) ? order.postbacks : [],
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.split('"').join('""')}"` : text;
}

export default {
  async session(ctx: any) {
    requireAdmin(ctx);
    const user = ctx.state?.user;
    ctx.body = { authenticated: true, username: user?.username || user?.email || null, id: user?.id || null };
  },

  async orders(ctx: any) {
    requireAdmin(ctx);
    const [page, pricing] = await Promise.all([
      readOrdersPage({
        page: ctx.query?.page,
        pageSize: ctx.query?.pageSize,
        query: ctx.query?.query,
        status: ctx.query?.status,
        dateFrom: ctx.query?.dateFrom,
        dateTo: ctx.query?.dateTo,
      }),
      readPricing(),
    ]);
    ctx.body = {
      orders: page.orders.map(orderSummary),
      pagination: page.pagination,
      pricing,
    };
  },

  async reconcile(ctx: any) {
    requireAdmin(ctx);
    ctx.body = { reconciliation: await reconcileActiveOrders() };
  },

  async updatePricing(ctx: any) {
    const actor = requireAdmin(ctx);
    const pricing = await savePricing(ctx.request.body || {}, actor);
    logger.info('Publication pricing updated by admin', {
      by: actor,
      residentKztAmount: pricing.residentKztAmount,
      usdToKztRate: pricing.usdToKztRate,
    });
    ctx.body = { pricing };
  },

  async updateOrder(ctx: any) {
    const actor = requireAdmin(ctx);
    const patch = sanitizeOrderPatch(ctx.request.body || {});
    const transition = await updateStore((store) => {
      const order = store.orders.find((item) => item.id === ctx.params.id);
      if (!order) return { updated: null, refundApplied: false };
      if (patch.publishedAt === true) patch.publishedAt = order.publishedAt || nowIso();
      const newStatus = refundOutcome(order, patch);
      Object.assign(order, patch);
      if (newStatus) {
        order.status = newStatus;
        order.refundedAt = nowIso();
      }
      order.updatedAt = nowIso();
      return { updated: { ...order }, refundApplied: Boolean(newStatus) };
    });
    const { updated, refundApplied } = transition;
    if (!updated) ctx.throw(404, 'Order not found');
    logger.info('Order updated by admin', { orderId: updated.id, by: actor, fields: Object.keys(patch), refundApplied });
    ctx.body = { order: updated };
  },

  async exportCsv(ctx: any) {
    requireAdmin(ctx);
    const store = await readStore();
    const columns = [
      'invoiceId', 'status', 'amount', 'currency', 'residency', 'fullName', 'email', 'phone',
      'articleTitle', 'paymentReceivedAt', 'publicationStatus', 'publishedAt', 'doi', 'articleUrl',
      'refundStatus', 'accountingStatus', 'halykReference', 'cardMask', 'createdAt', 'updatedAt',
    ];
    const lines = [columns.join(',')];
    for (const order of store.orders.map(orderSummary)) {
      lines.push(columns.map((col) => csvCell(order[col])).join(','));
    }
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="clinmedkaz-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
    ctx.body = `\uFEFF${lines.join('\n')}`;
  },
};
