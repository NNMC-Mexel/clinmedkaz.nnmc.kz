import crypto from 'node:crypto';
import { config, halykCredentialsConfigured } from '../../../lib/config';
import { evaluatePostlink, sanitizePostlinkPayload } from '../../../lib/domain';
import { logger } from '../../../lib/logger';
import { sendPaymentEmails } from '../../../lib/payment-emails';
import { updateStore } from '../../../lib/store';

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

export default {
  async postlink(ctx: any) {
    const payload = ctx.request.body || {};
    const auditPayload = sanitizePostlinkPayload(payload);
    const transition = await updateStore((store) => {
      const order = store.orders.find((item) => item.invoiceId === String(payload.invoiceId || ''));
      const expectedTerminalId = halykCredentialsConfigured() ? config.halyk.terminalId : '';
      const decision = evaluatePostlink(order || null, payload, expectedTerminalId);

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
        payload: auditPayload,
        receivedAt: nowIso(),
      });

      if (!order) return { paidOrder: null };
      if (!Array.isArray(order.postbacks)) order.postbacks = [];
      order.postbacks.unshift({ receivedAt: nowIso(), payload: auditPayload, action: decision.action });
      order.updatedAt = nowIso();

      if (decision.action === 'already_paid') {
        if (!order.halykReference && payload.reference) order.halykReference = payload.reference;
        if (!order.cardMask && payload.cardMask) order.cardMask = payload.cardMask;
        return { paidOrder: null };
      }
      if (['reject_secret', 'reject_amount', 'reject_terminal'].includes(decision.action)) {
        order.status = 'postlink_rejected';
        order.reason =
          decision.action === 'reject_amount'
            ? 'amount_or_currency_mismatch'
            : decision.action === 'reject_terminal'
              ? 'terminal_mismatch'
              : 'secret_mismatch';
        return { paidOrder: null };
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
        return { paidOrder: { ...order } };
      }
      return { paidOrder: null };
    });

    const paidOrder = transition.paidOrder;
    if (paidOrder) {
      logger.info('Payment confirmed', { orderId: paidOrder.id, invoiceId: paidOrder.invoiceId });
      await sendPaymentEmails(paidOrder, payload);
    }

    ctx.body = { status: 'ok' };
  },
};
