import crypto from 'node:crypto';
import { config } from '../../../lib/config';
import { requireAdmin } from '../../../lib/auth';
import { findArticleDuplicates, invitationPricingSnapshot, validateInvitationInput } from '../../../lib/domain';
import { buildInvitationEmail } from '../../../lib/email-templates';
import { logger } from '../../../lib/logger';
import { sendMail } from '../../../lib/mailer';
import { requirePaymentsEnabled } from '../../../lib/payment-availability';
import { readPricing } from '../../../lib/pricing';
import { readStore, updateStore } from '../../../lib/store';

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function invitationLink(invitation: Record<string, any>) {
  const url = new URL('/payment', config.baseUrl);
  url.searchParams.set('invite', invitation.id);
  url.searchParams.set('lang', invitation.lang || 'ru');
  return url.toString();
}

async function sendInvitationEmail(invitation: Record<string, any>) {
  const link = invitationLink(invitation);
  const email = buildInvitationEmail(invitation, link);
  return sendMail({
    to: invitation.email,
    ...email,
  });
}

export default {
  async createPaymentInvitation(ctx: any) {
    if (!requirePaymentsEnabled(ctx)) return;
    const actor = requireAdmin(ctx);
    const fields = validateInvitationInput(ctx.request.body || {});
    const sendEmail = ctx.request.body?.sendEmail !== false && ctx.request.body?.sendEmail !== 'false';
    const pricing = await readPricing();
    const invitation = {
      id: makeId('inv'),
      status: 'created',
      ...fields,
      ...invitationPricingSnapshot(pricing),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const duplicates = await updateStore((store) => {
      const currentDuplicates = findArticleDuplicates(store, invitation.articleTitle);
      store.invitations.unshift(invitation);
      return currentDuplicates;
    });
    logger.info('Invitation created', { invitationId: invitation.id, by: actor });

    let emailDelivered = false;
    if (sendEmail) {
      const result = await sendInvitationEmail(invitation);
      emailDelivered = Boolean(result.delivered);
    }

    const duplicateWarning = duplicates.paid ? 'alreadyPaid' : duplicates.activeLinks > 0 ? 'activeLinkExists' : null;
    ctx.body = { invitation, link: invitationLink(invitation), emailRequested: sendEmail, emailDelivered, duplicateWarning };
  },

  async resend(ctx: any) {
    if (!requirePaymentsEnabled(ctx)) return;
    const actor = requireAdmin(ctx);
    const store = await readStore();
    const invitation = store.invitations.find((item) => item.id === ctx.params.id);
    if (!invitation) ctx.throw(404, 'Invitation not found');
    if (invitation.status === 'cancelled') ctx.throw(409, 'Cannot resend a cancelled invitation.');
    const result = await sendInvitationEmail(invitation);
    logger.info('Invitation email resent', { invitationId: invitation.id, by: actor, delivered: result.delivered });
    ctx.body = { emailDelivered: Boolean(result.delivered), link: invitationLink(invitation) };
  },

  async cancel(ctx: any) {
    const actor = requireAdmin(ctx);
    const outcome = await updateStore((store) => {
      const invitation = store.invitations.find((item) => item.id === ctx.params.id);
      if (!invitation) return { kind: 'missing' as const };
      if (invitation.status === 'paid') return { kind: 'paid' as const };
      invitation.status = 'cancelled';
      invitation.updatedAt = nowIso();
      for (const order of store.orders) {
        if (order.invitationId === invitation.id && ['created', 'token_issued'].includes(order.status)) {
          order.status = 'cancelled';
          order.updatedAt = nowIso();
        }
      }
      return { kind: 'updated' as const, invitation: { ...invitation } };
    });
    if (outcome.kind === 'missing') ctx.throw(404, 'Invitation not found');
    if (outcome.kind === 'paid') ctx.throw(409, 'Cannot cancel a paid invitation.');
    const updated = outcome.invitation;
    logger.info('Invitation cancelled', { invitationId: updated.id, by: actor });
    ctx.body = { invitation: updated };
  },
};
