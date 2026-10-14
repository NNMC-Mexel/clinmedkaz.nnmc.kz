import { config } from './config';

export type PaymentRole = 'admin' | 'accountant' | 'economist';

const ADMIN_API = 'api::admin-api.admin-api';
const INVITATION_API = 'api::invitation.invitation';

// Strapi Users & Permissions actions per role. Bootstrap grants exactly these and removes them
// from every other role, so a route's auth scope is the first line of defence and requireRole()
// in the controller the second.
export const PAYMENT_ROLES: Record<PaymentRole, { type: string; name: string; description: string; actions: string[] }> = {
  admin: {
    type: config.paymentAdmin.roleType,
    name: 'Payment Admin',
    description: 'Restricted role for ClinMedKaz payment administration.',
    actions: [
      `${ADMIN_API}.session`,
      `${ADMIN_API}.orders`,
      `${ADMIN_API}.updateOrder`,
      `${ADMIN_API}.updatePricing`,
      `${ADMIN_API}.exchangeRate`,
      `${ADMIN_API}.reconcile`,
      `${ADMIN_API}.exportCsv`,
      `${ADMIN_API}.receipt`,
      `${ADMIN_API}.financeReport`,
      `${ADMIN_API}.analyticsReport`,
      `${ADMIN_API}.reportCsv`,
      `${INVITATION_API}.createPaymentInvitation`,
      `${INVITATION_API}.resend`,
      `${INVITATION_API}.cancel`,
    ],
  },
  // Money side: registers of payments and refunds, reconciliation and refund processing.
  accountant: {
    type: 'payment-accountant',
    name: 'Payment Accountant',
    description: 'ClinMedKaz accountant: payment and refund registers, reconciliation, refunds.',
    actions: [
      `${ADMIN_API}.session`,
      `${ADMIN_API}.orders`,
      `${ADMIN_API}.updateOrder`,
      `${ADMIN_API}.reconcile`,
      `${ADMIN_API}.exportCsv`,
      `${ADMIN_API}.receipt`,
      `${ADMIN_API}.financeReport`,
      `${ADMIN_API}.reportCsv`,
    ],
  },
  // Aggregated analytics only: no author names, emails or phones reach this role.
  economist: {
    type: 'payment-economist',
    name: 'Payment Economist',
    description: 'ClinMedKaz economist: aggregated revenue, conversion and pricing analytics.',
    actions: [
      `${ADMIN_API}.session`,
      `${ADMIN_API}.analyticsReport`,
      `${ADMIN_API}.reportCsv`,
    ],
  },
};

// When one user is listed for several roles the broadest one wins.
export const ROLE_PRECEDENCE: PaymentRole[] = ['admin', 'accountant', 'economist'];

export const ROLE_CAPABILITIES: Record<PaymentRole, Record<string, boolean>> = {
  admin: {
    createLinks: true,
    viewTransactions: true,
    editPublication: true,
    editAccounting: true,
    managePricing: true,
    financeReports: true,
    analyticsReports: true,
  },
  accountant: {
    createLinks: false,
    viewTransactions: true,
    editPublication: false,
    editAccounting: true,
    managePricing: false,
    financeReports: true,
    analyticsReports: false,
  },
  economist: {
    createLinks: false,
    viewTransactions: false,
    editPublication: false,
    editAccounting: false,
    managePricing: false,
    financeReports: false,
    analyticsReports: true,
  },
};

export function roleFromType(type: unknown): PaymentRole | null {
  const match = ROLE_PRECEDENCE.find((role) => PAYMENT_ROLES[role].type === type);
  return match || null;
}

export function sensitiveActions() {
  return [...new Set(ROLE_PRECEDENCE.flatMap((role) => PAYMENT_ROLES[role].actions))];
}

const ACCOUNTANT_ORDER_FIELDS = new Set(['accountingStatus', 'refundStatus', 'refundReason', 'adminComment']);

// Accountants work with the money fields only; publication data stays with the editorial office.
// Returns the fields the role may not change (empty when the patch is allowed).
export function forbiddenOrderFields(role: PaymentRole, patch: Record<string, any>) {
  if (role === 'admin') return [];
  return Object.keys(patch).filter((field) => role !== 'accountant' || !ACCOUNTANT_ORDER_FIELDS.has(field));
}
