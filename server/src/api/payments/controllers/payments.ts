import crypto from 'node:crypto';
import { config } from '../../../lib/config';
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
import { readStore, updateStore } from '../../../lib/store';

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

export default {
  async create(ctx: any) {
    const input = validateOrderInput(ctx.request.body || {});
    const store = await readStore();
    const invitation = store.invitations.find((item) => item.id === input.invitationId);
    if (!invitation || invitation.status === 'cancelled') throw new Error('Payment link is invalid or cancelled.');
    if (invitation.status === 'paid' || paidOrderForInvitation(store, invitation.id)) {
      throw new Error('This article publication has already been paid.');
    }
    if (isArticleAlreadyPaid(store, invitation.articleTitle, invitation.id)) {
      throw new Error('This article has already been paid through another link.');
    }
    const existing = activeOrderForInvitation(store, invitation.id);
    if (existing) {
      ctx.body = { payUrl: `/pay/${existing.id}?lang=${encodeURIComponent(existing.lang || input.lang)}` };
      return;
    }

    const price = calculateOrderPrice(input.residency, invitation);
    const order = {
      id: makeId('ord'),
      invoiceId: makeInvoiceId(),
      secretHash: makeSecretHash(),
      status: 'created',
      amount: price.amount,
      currency: price.currency,
      publicationFeeUsd: Number(invitation.publicationFeeUsd || config.pricing.publicationFeeUsd),
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
      createdAt: nowIso(),
      updatedAt: nowIso(),
      postbacks: [],
    };

    await updateStore((state) => {
      state.orders.unshift(order);
      const invite = state.invitations.find((item) => item.id === order.invitationId);
      if (invite && invite.status === 'created') {
        invite.status = 'payment_started';
        invite.updatedAt = nowIso();
      }
    });

    logger.info('Order created', { orderId: order.id, invoiceId: order.invoiceId, amount: order.amount, currency: order.currency });
    ctx.body = { payUrl: `/pay/${order.id}?lang=${encodeURIComponent(order.lang)}` };
  },

  async paymentObject(ctx: any) {
    const store = await readStore();
    const order = store.orders.find((item) => item.id === ctx.params.id);
    if (!order) ctx.throw(404, 'Order not found');
    if (order.status === 'paid') ctx.throw(409, 'This order has already been paid.');
    if (ORDER_CLOSED_STATUSES.includes(order.status)) {
      ctx.throw(409, 'This payment link is no longer active. Please return to the article payment link.');
    }
    const postLink = postLinkUrl();
    const auth = await getPaymentToken({
      invoiceId: order.invoiceId,
      secretHash: order.secretHash,
      amount: order.amount,
      currency: order.currency,
      postLink,
      failurePostLink: postLink,
    });
    await updateStore((state) => {
      const current = state.orders.find((item) => item.id === order.id);
      if (current && current.status === 'created') {
        current.status = 'token_issued';
        current.updatedAt = nowIso();
      }
    });
    ctx.body = { paymentObject: makePaymentObject({ order, auth }) };
  },
};
