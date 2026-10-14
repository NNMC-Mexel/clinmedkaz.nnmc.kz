import { requireAdmin, requireRole } from '../../../lib/auth';
import { refundOutcome, refundPatchError, sanitizeOrderPatch } from '../../../lib/domain';
import { logger } from '../../../lib/logger';
import { fetchOfficialUsdRate } from '../../../lib/exchange-rate';
import { readPricing, savePricing } from '../../../lib/pricing';
import { buildReceiptPdf, receiptFileName } from '../../../lib/receipt-pdf';
import { reconcileActiveOrders } from '../../../lib/reconciliation';
import {
  REPORT_EXPORTS,
  buildAnalyticsReport,
  buildFinanceReport,
  exportRows,
  isReportExport,
  reportCsv,
  resolvePeriod,
} from '../../../lib/reports';
import { ROLE_CAPABILITIES, forbiddenOrderFields } from '../../../lib/roles';
import { readOrdersPage, readReportData, readStore, updateStore } from '../../../lib/store';

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
    firstOpenedAt: order.firstOpenedAt || null,
    lastOpenedAt: order.lastOpenedAt || null,
    openCount: Number(order.openCount) || 0,
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.split('"').join('""')}"` : text;
}

export default {
  async session(ctx: any) {
    const { role } = requireRole(ctx, ['admin', 'accountant', 'economist']);
    const user = ctx.state?.user;
    ctx.body = {
      authenticated: true,
      username: user?.username || user?.email || null,
      id: user?.id || null,
      role,
      capabilities: ROLE_CAPABILITIES[role],
    };
  },

  async orders(ctx: any) {
    requireRole(ctx, ['admin', 'accountant']);
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
    requireRole(ctx, ['admin', 'accountant']);
    ctx.body = { reconciliation: await reconcileActiveOrders() };
  },

  async updatePricing(ctx: any) {
    const actor = requireAdmin(ctx);
    const pricing = await savePricing(ctx.request.body || {}, actor);
    logger.info('Publication pricing updated by admin', {
      by: actor,
      baseCurrency: pricing.baseCurrency,
      baseAmount: pricing.baseAmount,
      rateMode: pricing.rateMode,
      residentKztAmount: pricing.residentKztAmount,
      usdToKztRate: pricing.usdToKztRate,
    });
    ctx.body = { pricing };
  },

  // Today's National Bank rate, for the pricing form preview before the admin saves.
  async exchangeRate(ctx: any) {
    requireAdmin(ctx);
    try {
      ctx.body = { exchangeRate: await fetchOfficialUsdRate() };
    } catch {
      ctx.status = 502;
      ctx.body = {
        error: {
          status: 502,
          name: 'ExchangeRateUnavailableError',
          message: 'Could not load the National Bank exchange rate.',
          details: { code: 'EXCHANGE_RATE_UNAVAILABLE' },
        },
      };
    }
  },

  async updateOrder(ctx: any) {
    const { actor, role } = requireRole(ctx, ['admin', 'accountant']);
    const patch = sanitizeOrderPatch(ctx.request.body || {});
    const forbidden = forbiddenOrderFields(role, patch);
    if (forbidden.length) ctx.throw(403, `This role cannot change: ${forbidden.join(', ')}`);
    const transition = await updateStore((store) => {
      const order = store.orders.find((item) => item.id === ctx.params.id);
      if (!order) return { updated: null, refundApplied: false };
      const refundError = refundPatchError(order, patch);
      if (refundError) return { updated: null, refundApplied: false, refundError };
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
    if ('refundError' in transition && transition.refundError) ctx.throw(400, transition.refundError);
    if (!updated) ctx.throw(404, 'Order not found');
    logger.info('Order updated by admin', { orderId: updated.id, by: actor, role, fields: Object.keys(patch), refundApplied });
    ctx.body = { order: updated };
  },

  async exportCsv(ctx: any) {
    requireRole(ctx, ['admin', 'accountant']);
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

  // Admins can also re-download receipts for orders refunded after payment.
  async receipt(ctx: any) {
    requireRole(ctx, ['admin', 'accountant']);
    const store = await readStore();
    const order = store.orders.find((item) => item.id === ctx.params.id);
    if (!order || !order.paymentReceivedAt) ctx.throw(404, 'Receipt not found');
    ctx.set('Content-Type', 'application/pdf');
    ctx.set('Content-Disposition', `attachment; filename="${receiptFileName(order)}"`);
    ctx.set('Cache-Control', 'private, no-store');
    ctx.body = await buildReceiptPdf(order);
  },

  // Accountant view: registers of payments and refunds for the period, daily totals for matching
  // bank settlements, and what still needs reconciling.
  async financeReport(ctx: any) {
    requireRole(ctx, ['admin', 'accountant']);
    const period = resolvePeriod(ctx.query || {});
    const [data, pricing] = await Promise.all([readReportData(), readPricing()]);
    ctx.body = { report: buildFinanceReport(data, pricing, period) };
  },

  // Economist view: aggregates only, by default over the last 12 months.
  async analyticsReport(ctx: any) {
    requireRole(ctx, ['admin', 'economist']);
    const period = resolvePeriod(ctx.query || {}, Date.now(), 12);
    const [data, pricing] = await Promise.all([readReportData(), readPricing()]);
    ctx.body = { report: buildAnalyticsReport(data, pricing, period) };
  },

  async reportCsv(ctx: any) {
    const name = String(ctx.query?.report || '');
    if (!isReportExport(name)) return ctx.throw(400, 'Unknown report.');
    const kind = REPORT_EXPORTS[name];
    requireRole(ctx, kind === 'finance' ? ['admin', 'accountant'] : ['admin', 'economist']);
    const period = resolvePeriod(ctx.query || {}, Date.now(), kind === 'finance' ? 1 : 12);
    const [data, pricing] = await Promise.all([readReportData(), readPricing()]);
    const rows = exportRows(
      name,
      kind === 'finance' ? buildFinanceReport(data, pricing, period) : null,
      kind === 'analytics' ? buildAnalyticsReport(data, pricing, period) : null
    );
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="clinmedkaz-${name}-${period.from}_${period.to}.csv"`);
    ctx.set('Cache-Control', 'private, no-store');
    ctx.body = reportCsv(name, rows, ctx.query?.lang);
  },
};
