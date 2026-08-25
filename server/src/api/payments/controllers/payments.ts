import crypto from 'node:crypto';
import {
  activeOrderForInvitation,
  calculateOrderPrice,
  isArticleAlreadyPaid,
  ORDER_CLOSED_STATUSES,
  paidOrderForInvitation,
  validateOrderInput,
} from '../../../lib/domain';
import { getPaymentToken, makeInvoiceId, makePaymentObject, makeSecretHash, postLinkUrl } from '../../../lib/halyk';
import { logger } from '../../../lib/logger';
import { requirePaymentsEnabled } from '../../../lib/payment-availability';
import { readPricing } from '../../../lib/pricing';
import { reconcileOrder } from '../../../lib/reconciliation';
import { readStore, updateStore } from '../../../lib/store';

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

export default {
  async create(ctx: any) {
    if (!requirePaymentsEnabled(ctx)) return;
    const input = validateOrderInput(ctx.request.body || {});
    const pricing = await readPricing();
    const outcome = await updateStore((state) => {
      const invitation = state.invitations.find((item) => item.id === input.invitationId);
      if (!invitation) return { kind: 'missing' as const };
      if (invitation.status === 'cancelled') return { kind: 'cancelled' as const };
      if (invitation.status === 'paid' || paidOrderForInvitation(state, invitation.id)) {
        return { kind: 'paid' as const };
      }
      if (isArticleAlreadyPaid(state, invitation.articleTitle, invitation.id)) {
        return { kind: 'duplicate' as const };
      }
      const existing = activeOrderForInvitation(state, invitation.id);
      if (existing) return { kind: 'existing' as const, order: { ...existing } };

      const price = calculateOrderPrice(input.residency, invitation, pricing);
      const timestamp = nowIso();
      const order = {
        id: makeId('ord'),
        invoiceId: makeInvoiceId(),
        secretHash: makeSecretHash(),
        status: 'created',
        amount: price.amount,
        currency: price.currency,
        publicationFeeUsd: Number(invitation.publicationFeeUsd || pricing.publicationFeeUsd),
        exchangeRate: price.exchangeRate,
        residency: input.residency,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        articleTitle: invitation.articleTitle,
        lang: input.lang,
        invitationId: invitation.id,
        paymentReceivedAt: null,
        publicationStatus: 'pending_payment',
        publishedAt: null,
        articleUrl: '',
        doi: '',
        refundStatus: 'none',
        refundReason: '',
        accountingStatus: 'new',
        adminComment: '',
        createdAt: timestamp,
        updatedAt: timestamp,
        postbacks: [],
      };
      state.orders.unshift(order);
      if (invitation.status === 'created') {
        invitation.status = 'payment_started';
        invitation.updatedAt = timestamp;
      }
      return { kind: 'created' as const, order: { ...order } };
    });

    if (outcome.kind === 'missing') ctx.throw(404, 'Payment link is invalid or cancelled.');
    if (outcome.kind === 'cancelled') ctx.throw(410, 'Payment link is invalid or cancelled.');
    if (outcome.kind === 'paid') ctx.throw(409, 'This article publication has already been paid.');
    if (outcome.kind === 'duplicate') ctx.throw(409, 'This article has already been paid through another link.');
    const order = outcome.order;
    if (outcome.kind === 'existing') {
      ctx.body = { payUrl: `/pay/${order.id}?lang=${encodeURIComponent(order.lang || input.lang)}` };
      return;
    }
    logger.info('Order created', { orderId: order.id, invoiceId: order.invoiceId, amount: order.amount, currency: order.currency });
    ctx.body = { payUrl: `/pay/${order.id}?lang=${encodeURIComponent(order.lang)}` };
  },

  async paymentObject(ctx: any) {
    if (!requirePaymentsEnabled(ctx)) return;
    const store = await readStore();
    const order = store.orders.find((item) => item.id === ctx.params.id);
    if (!order) ctx.throw(404, 'Order not found');
    if (order.status === 'paid') ctx.throw(409, 'This order has already been paid.');
    if (ORDER_CLOSED_STATUSES.includes(order.status)) {
      ctx.throw(409, 'This payment link is no longer active. Please return to the article payment link.');
    }
    const postLink = postLinkUrl();
    let auth;
    try {
      auth = await getPaymentToken({
        invoiceId: order.invoiceId,
        secretHash: order.secretHash,
        amount: order.amount,
        currency: order.currency,
        postLink,
        failurePostLink: postLink,
      });
    } catch (error) {
      logger.error('Payment provider token request failed', { orderId: order.id, error: String(error) });
      ctx.throw(502, 'Payment provider is temporarily unavailable.');
    }
    await updateStore((state) => {
      const current = state.orders.find((item) => item.id === order.id);
      if (current && current.status === 'created') {
        current.status = 'token_issued';
        current.updatedAt = nowIso();
      }
    });
    ctx.body = { paymentObject: makePaymentObject({ order, auth }) };
  },

  async reconcile(ctx: any) {
    if (!requirePaymentsEnabled(ctx)) return;
    const result = await reconcileOrder(String(ctx.params.id || ''));
    if (!result.found) ctx.throw(404, 'Order not found');
    ctx.body = result;
  },
};
