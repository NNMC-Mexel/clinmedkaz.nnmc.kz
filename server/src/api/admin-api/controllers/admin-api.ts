import { adminSession, authenticateAdmin, clearAdminSessionCookie, requireAdmin, setAdminSessionCookie } from '../../../lib/auth';
import { refundOutcome, sanitizeOrderPatch } from '../../../lib/domain';
import { logger } from '../../../lib/logger';
import { readStore, updateStore } from '../../../lib/store';

function nowIso() {
  return new Date().toISOString();
}

function orderSummary(order: Record<string, any>) {
  return {
    id: order.id,
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
    const session = adminSession(ctx);
    if (!session) {
      ctx.status = 401;
      ctx.body = { authenticated: false };
      return;
    }
    ctx.body = { authenticated: true, username: session.username, source: session.source || 'env', role: session.role || null };
  },

  async login(ctx: any) {
    const matched = await authenticateAdmin(ctx.request.body?.username, ctx.request.body?.password);
    if (!matched) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid username or password' };
      return;
    }
    setAdminSessionCookie(ctx, { username: matched.username, source: matched.source, role: matched.role || null });
    logger.info('Admin signed in', { username: matched.username, source: matched.source });
    ctx.body = { authenticated: true, username: matched.username, source: matched.source };
  },

  async logout(ctx: any) {
    clearAdminSessionCookie(ctx);
    ctx.body = { authenticated: false };
  },

  async orders(ctx: any) {
    requireAdmin(ctx);
    const store = await readStore();
    ctx.body = {
      invitations: store.invitations,
      callbacks: store.callbacks || [],
      auditLog: [],
      orders: store.orders.map(orderSummary),
    };
  },

  async updateOrder(ctx: any) {
    const actor = requireAdmin(ctx);
    const patch = sanitizeOrderPatch(ctx.request.body || {});
    let updated: Record<string, any> | null = null;
    let refundApplied = false;
    await updateStore((store) => {
      const order = store.orders.find((item) => item.id === ctx.params.id);
      if (!order) return;
      if (patch.publishedAt === true) patch.publishedAt = order.publishedAt || nowIso();
      const newStatus = refundOutcome(order, patch);
      Object.assign(order, patch);
      if (newStatus) {
        order.status = newStatus;
        order.refundedAt = nowIso();
        refundApplied = true;
      }
      order.updatedAt = nowIso();
      updated = order;
    });
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
