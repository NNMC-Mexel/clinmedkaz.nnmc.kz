import { publicConfig } from '../../../lib/config';
import { cleanText, normalizeLanguage, SUPPORTED_LANGUAGES } from '../../../lib/domain';
import { adminSession } from '../../../lib/auth';
import { readStore } from '../../../lib/store';

function invitationSummary(invitation: Record<string, any> | null) {
  if (!invitation) return null;
  return {
    id: invitation.id,
    status: invitation.status,
    fullName: invitation.fullName || '',
    email: invitation.email || '',
    phone: invitation.phone || '',
    articleTitle: invitation.articleTitle || '',
    lang: invitation.lang || 'ru',
  };
}

function publicOrderSummary(order: Record<string, any> | null) {
  if (!order) return null;
  return {
    id: order.id,
    invoiceId: order.invoiceId,
    status: order.status,
    amount: order.amount,
    currency: order.currency,
    fullName: order.fullName,
    articleTitle: order.articleTitle,
    invitationId: order.invitationId || null,
    lang: order.lang || 'ru',
  };
}

function orderIdFromPath(pathname: string) {
  const match = String(pathname || '').match(/^\/(?:pay|payment\/success|payment\/failure)\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default {
  async context(ctx: any) {
    const lang = normalizeLanguage(ctx.query?.lang || ctx.get('accept-language')?.slice(0, 2));
    const pathname = cleanText(ctx.query?.path || '/', 240) || '/';
    const inviteId = cleanText(ctx.query?.invite, 80);
    const paymentOrderId = orderIdFromPath(pathname);
    const store = inviteId || paymentOrderId ? await readStore() : { invitations: [], orders: [] };
    const invitation = inviteId
      ? store.invitations.find((item) => item.id === inviteId && item.status !== 'cancelled')
      : null;
    const order = paymentOrderId ? store.orders.find((item) => item.id === paymentOrderId) : null;

    ctx.body = {
      lang,
      supportedLanguages: SUPPORTED_LANGUAGES,
      config: publicConfig(),
      invitation: invitationSummary(invitation || null),
      order: publicOrderSummary(order || null),
      adminAuthenticated: Boolean(adminSession(ctx)),
    };
  },
};
