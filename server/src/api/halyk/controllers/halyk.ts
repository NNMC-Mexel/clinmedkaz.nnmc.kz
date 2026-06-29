import crypto from 'node:crypto';
import { config } from '../../../lib/config';
import { evaluatePostlink, timingSafeEqualText } from '../../../lib/domain';
import { logger } from '../../../lib/logger';
import { sendMail } from '../../../lib/mailer';
import { updateStore } from '../../../lib/store';

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

async function notifyAdminPaid(order: Record<string, any>, payload: Record<string, any>) {
  return sendMail({
    to: config.adminEmail,
    subject: `ClinMedKaz payment received: ${order.invoiceId}`,
    text: `Payment received for ${order.articleTitle}. Amount: ${order.amount} ${order.currency}. Reference: ${payload.reference || ''}`,
    html: `<p>Payment received.</p><p><strong>Invoice:</strong> ${order.invoiceId}</p><p><strong>Article:</strong> ${order.articleTitle}</p><p><strong>Amount:</strong> ${order.amount} ${order.currency}</p>`,
  });
}

async function sendPayerReceipt(order: Record<string, any>) {
  return sendMail({
    to: order.email,
    subject: 'ClinMedKaz payment receipt',
    text: `Payment received. Invoice: ${order.invoiceId}. Article: ${order.articleTitle}. Amount: ${order.amount} ${order.currency}.`,
    html: `<p>Payment received.</p><p><strong>Invoice:</strong> ${order.invoiceId}</p><p><strong>Article:</strong> ${order.articleTitle}</p><p><strong>Amount:</strong> ${order.amount} ${order.currency}</p>`,
  });
}

export default {
  async postlink(ctx: any) {
    if (config.halyk.postLinkSecret && !timingSafeEqualText(ctx.query?.key, config.halyk.postLinkSecret)) {
      logger.warn('Postlink rejected: bad key', { ip: ctx.ip });
      ctx.throw(403, 'Forbidden');
    }

    const payload = ctx.request.body || {};
    let paidOrder: Record<string, any> | null = null;
    await updateStore((store) => {
      const order = store.orders.find((item) => item.invoiceId === String(payload.invoiceId || ''));
      const decision = evaluatePostlink(order || null, payload);

      store.callbacks.unshift({
        id: makeId('cb'),
        invoiceId: String(payload.invoiceId || ''),
        matchedOrderId: order?.id || '',
        matched: Boolean(order),
        secretMatches: decision.secretMatches,
        amountChecked: decision.amount.checked,
        amountOk: decision.amount.ok,
        action: decision.action,
        code: String(payload.code || ''),
        reference: String(payload.reference || ''),
        payload,
        receivedAt: nowIso(),
      });

      if (!order) return;
      if (!Array.isArray(order.postbacks)) order.postbacks = [];
      order.postbacks.unshift({ receivedAt: nowIso(), payload, action: decision.action });
      order.updatedAt = nowIso();

      if (decision.action === 'already_paid') {
        if (!order.halykReference && payload.reference) order.halykReference = payload.reference;
        if (!order.cardMask && payload.cardMask) order.cardMask = payload.cardMask;
        return;
      }
      if (decision.action === 'reject_secret' || decision.action === 'reject_amount') {
        order.status = 'postlink_rejected';
        order.reason = decision.action === 'reject_amount' ? 'amount_mismatch' : 'secret_mismatch';
        return;
      }

      order.status = decision.action;
      order.halykReference = payload.reference || '';
      order.cardMask = payload.cardMask || '';
      order.reason = payload.reason || '';
      if (decision.action === 'paid') {
        order.paymentReceivedAt = nowIso();
        order.publicationStatus = 'ready_to_publish';
        const invite = store.invitations.find((item) => item.id === order.invitationId);
        if (invite) {
          invite.status = 'paid';
          invite.updatedAt = nowIso();
        }
        paidOrder = order;
      }
    });

    if (paidOrder) {
      logger.info('Payment confirmed', { orderId: paidOrder.id, invoiceId: paidOrder.invoiceId });
      await Promise.all([notifyAdminPaid(paidOrder, payload), sendPayerReceipt(paidOrder)]);
    }

    ctx.body = { status: 'ok' };
  },
};
