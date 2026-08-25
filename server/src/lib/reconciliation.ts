import { config, halykCredentialsConfigured } from './config';
import { evaluateHalykTransaction, ORDER_ACTIVE_STATUSES } from './domain';
import { getHalykTransactionStatus } from './halyk';
import { logger } from './logger';
import { sendPaymentEmails } from './payment-emails';
import { readActiveOrderIds, readStore, updateStore } from './store';

function nowIso() {
  return new Date().toISOString();
}

const reconciliationCooldownMs = 10_000;
const recentChecks = new Map<string, { checkedAt: number; result: Record<string, any> }>();

function cacheResult(orderId: string, result: Record<string, any>) {
  recentChecks.set(orderId, { checkedAt: Date.now(), result });
  if (recentChecks.size > 1_000) recentChecks.delete(recentChecks.keys().next().value);
  return result;
}

export async function reconcileOrder(orderId: string) {
  const store = await readStore();
  const snapshot = store.orders.find((item) => item.id === orderId);
  if (!snapshot) return { checked: false, found: false, status: null, reason: 'not_found' };
  if (!ORDER_ACTIVE_STATUSES.includes(snapshot.status)) {
    return { checked: false, found: true, status: snapshot.status, reason: 'final_status' };
  }
  if (!config.halyk.statusSyncEnabled || !halykCredentialsConfigured()) {
    return { checked: false, found: true, status: snapshot.status, reason: 'status_sync_disabled' };
  }
  const recent = recentChecks.get(snapshot.id);
  if (recent && Date.now() - recent.checkedAt < reconciliationCooldownMs) {
    return { ...recent.result, throttled: true };
  }

  try {
    const bankResponse = await getHalykTransactionStatus(snapshot.invoiceId);
    const decision = evaluateHalykTransaction(snapshot, bankResponse, config.halyk.terminalId);
    const transaction = bankResponse?.transaction || {};
    const transition = await updateStore((state) => {
      const order = state.orders.find((item) => item.id === snapshot.id);
      if (!order || !ORDER_ACTIVE_STATUSES.includes(order.status)) {
        return { updated: null, becamePaid: false };
      }
      if (!Array.isArray(order.postbacks)) order.postbacks = [];
      order.postbacks.unshift({
        receivedAt: nowIso(),
        source: 'halyk_status',
        action: decision.action,
        statusName: transaction.statusName || transaction.status || '',
        reference: transaction.reference || '',
      });
      order.updatedAt = nowIso();
      order.reason = decision.reason || '';

      if (decision.action === 'paid') {
        order.status = 'paid';
        order.paymentReceivedAt = transaction.createdDate || transaction.dateTime || nowIso();
        order.publicationStatus = 'ready_to_publish';
        order.halykReference = transaction.reference || order.halykReference || '';
        order.cardMask = transaction.cardMask || order.cardMask || '';
        const invitation = state.invitations.find((item) => item.id === order.invitationId);
        if (invitation) {
          invitation.status = 'paid';
          invitation.updatedAt = nowIso();
        }
      } else if (decision.action === 'refunded') {
        order.status = 'refunded';
        order.refundStatus = 'processed';
        order.refundedAt = transaction.createdDate || transaction.dateTime || nowIso();
        order.publicationStatus = 'cancelled';
      } else if (decision.action === 'failed') {
        order.status = 'failed';
      } else if (decision.action === 'reject') {
        order.status = 'postlink_rejected';
      }
      return { updated: { ...order }, becamePaid: decision.action === 'paid' };
    });

    const { updated, becamePaid } = transition;
    if (becamePaid && updated) await sendPaymentEmails(updated, transaction);
    return cacheResult(snapshot.id, {
      checked: true,
      found: true,
      status: updated?.status || snapshot.status,
      action: decision.action,
      reason: decision.reason,
    });
  } catch (error) {
    logger.warn('Halyk status reconciliation failed', { orderId: snapshot.id, error: String(error) });
    return cacheResult(snapshot.id, {
      checked: false,
      found: true,
      status: snapshot.status,
      reason: 'status_service_unavailable',
    });
  }
}

export async function reconcileActiveOrders(limit = 100) {
  const activeIds = await readActiveOrderIds(ORDER_ACTIVE_STATUSES, limit);
  const results = [];
  for (const orderId of activeIds) results.push(await reconcileOrder(orderId));
  return {
    checked: results.filter((item) => item.checked).length,
    updated: results.filter((item) => item.checked && item.action && item.action !== 'pending').length,
    skipped: results.filter((item) => !item.checked).length,
  };
}
