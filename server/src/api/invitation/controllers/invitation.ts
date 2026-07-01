import crypto from 'node:crypto';
import { config } from '../../../lib/config';
import { requireAdmin } from '../../../lib/auth';
import { findArticleDuplicates, invitationPricingSnapshot, validateInvitationInput } from '../../../lib/domain';
import { logger } from '../../../lib/logger';
import { sendMail } from '../../../lib/mailer';
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
  return sendMail({
    to: invitation.email,
    subject: 'ClinMedKaz article publication payment',
    text: `Your article has been accepted. Please complete publication payment here: ${link}`,
    html: `<p>Your article has been accepted.</p><p><strong>Article:</strong> ${invitation.articleTitle}</p><p><a href="${link}">${link}</a></p>`,
  });
}

export default {
  async createPaymentInvitation(ctx: any) {
    const actor = requireAdmin(ctx);
    const fields = validateInvitationInput(ctx.request.body || {});
    const sendEmail = ctx.request.body?.sendEmail !== false && ctx.request.body?.sendEmail !== 'false';
    const invitation = {
      id: makeId('inv'),
      status: 'created',
      ...fields,
      ...invitationPricingSnapshot(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    let duplicates = { paid: false, activeLinks: 0 };
    await updateStore((store) => {
      duplicates = findArticleDuplicates(store, invitation.articleTitle);
      store.invitations.unshift(invitation);
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
    const actor = requireAdmin(ctx);
    const store = await readStore();
    const invitation = store.invitations.find((item) => item.id === ctx.params.id);
    if (!invitation) ctx.throw(404, 'Invitation not found');
    if (invitation.status === 'cancelled') throw new Error('Cannot resend a cancelled invitation.');
    const result = await sendInvitationEmail(invitation);
    logger.info('Invitation email resent', { invitationId: invitation.id, by: actor, delivered: result.delivered });
    ctx.body = { emailDelivered: Boolean(result.delivered), link: invitationLink(invitation) };
  },

  async cancel(ctx: any) {
    const actor = requireAdmin(ctx);
    let updated: Record<string, any> | null = null;
    await updateStore((store) => {
      const invitation = store.invitations.find((item) => item.id === ctx.params.id);
      if (!invitation) return;
      if (invitation.status === 'paid') {
        const error = new Error('Cannot cancel a paid invitation.') as Error & { status?: number };
        error.status = 409;
        throw error;
      }
      invitation.status = 'cancelled';
      invitation.updatedAt = nowIso();
      updated = invitation;
      for (const order of store.orders) {
        if (order.invitationId === invitation.id && ['created', 'token_issued'].includes(order.status)) {
          order.status = 'cancelled';
          order.updatedAt = nowIso();
        }
      }
    });
    if (!updated) ctx.throw(404, 'Invitation not found');
    logger.info('Invitation cancelled', { invitationId: updated.id, by: actor });
    ctx.body = { invitation: updated };
  },
};
