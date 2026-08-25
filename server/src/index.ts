import type { Core } from '@strapi/strapi';
import { assertProductionSecurityConfig, config } from './lib/config';

const PAYMENT_ADMIN_ACTIONS = [
  'api::admin-api.admin-api.session',
  'api::admin-api.admin-api.orders',
  'api::admin-api.admin-api.updateOrder',
  'api::admin-api.admin-api.updatePricing',
  'api::admin-api.admin-api.reconcile',
  'api::admin-api.admin-api.exportCsv',
  'api::invitation.invitation.createPaymentInvitation',
  'api::invitation.invitation.resend',
  'api::invitation.invitation.cancel',
];

async function securePaymentAdministration(strapi: Core.Strapi) {
  assertProductionSecurityConfig();

  if (!config.payments.enabled) {
    strapi.log.warn('[payments] degraded mode is active; Halyk requests and new payment links are disabled');
  }

  const settingsStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = ((await settingsStore.get({ key: 'advanced' })) || {}) as Record<string, any>;
  if (advanced.allow_register !== false) {
    await settingsStore.set({ key: 'advanced', value: { ...advanced, allow_register: false } });
  }

  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  let paymentAdminRole = await roleQuery.findOne({ where: { type: config.paymentAdmin.roleType } });
  if (!paymentAdminRole) {
    paymentAdminRole = await roleQuery.create({
      data: {
        name: 'Payment Admin',
        description: 'Restricted role for ClinMedKaz payment administration.',
        type: config.paymentAdmin.roleType,
      },
    });
  }

  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const sensitivePermissions = await permissionQuery.findMany({
    where: { action: { $in: [...PAYMENT_ADMIN_ACTIONS, 'plugin::users-permissions.auth.register'] } },
    populate: ['role'],
  });

  const adminActions = new Set(
    sensitivePermissions
      .filter((permission: any) => permission.role?.id === paymentAdminRole.id)
      .map((permission: any) => permission.action)
  );

  for (const permission of sensitivePermissions as any[]) {
    const isAdminPermission = PAYMENT_ADMIN_ACTIONS.includes(permission.action);
    const belongsToPaymentAdmin = permission.role?.id === paymentAdminRole.id;
    const isPublicRegistration = permission.action === 'plugin::users-permissions.auth.register';
    if ((isAdminPermission && !belongsToPaymentAdmin) || isPublicRegistration) {
      await permissionQuery.delete({ where: { id: permission.id } });
    }
  }

  for (const action of PAYMENT_ADMIN_ACTIONS) {
    if (!adminActions.has(action)) {
      await permissionQuery.create({ data: { action, role: paymentAdminRole.id } });
    }
  }

  const configuredUsernames = new Set(config.paymentAdmin.usernames);
  const configuredEmails = new Set(config.paymentAdmin.emails);
  const userQuery = strapi.db.query('plugin::users-permissions.user');
  const users = await userQuery.findMany({ populate: ['role'] });
  let assigned = 0;
  for (const user of users as any[]) {
    const selected =
      configuredUsernames.has(String(user.username || '').toLowerCase()) ||
      configuredEmails.has(String(user.email || '').toLowerCase());
    if (selected && user.role?.id !== paymentAdminRole.id) {
      await userQuery.update({ where: { id: user.id }, data: { role: paymentAdminRole.id } });
      assigned += 1;
    }
  }

  strapi.log.info(
    `[payment-admin] public registration disabled; ${PAYMENT_ADMIN_ACTIONS.length} permissions secured; ${assigned} user(s) assigned`
  );
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register() {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await securePaymentAdministration(strapi);
  },
};
