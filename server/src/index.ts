import type { Core } from '@strapi/strapi';
import { assertProductionSecurityConfig, config } from './lib/config';
import { PAYMENT_ROLES, ROLE_PRECEDENCE, sensitiveActions, type PaymentRole } from './lib/roles';

const ROLE_ASSIGNMENTS: Record<PaymentRole, { usernames: string[]; emails: string[] }> = {
  admin: config.paymentAdmin,
  accountant: config.paymentAccountant,
  economist: config.paymentEconomist,
};

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
  const roleIds = {} as Record<PaymentRole, number>;
  for (const key of ROLE_PRECEDENCE) {
    const definition = PAYMENT_ROLES[key];
    let role = await roleQuery.findOne({ where: { type: definition.type } });
    if (!role) {
      role = await roleQuery.create({
        data: { name: definition.name, description: definition.description, type: definition.type },
      });
    }
    roleIds[key] = role.id;
  }

  // Every payment action belongs only to the roles listed for it in lib/roles.ts.
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const actions = sensitiveActions();
  const sensitivePermissions = await permissionQuery.findMany({
    where: { action: { $in: [...actions, 'plugin::users-permissions.auth.register'] } },
    populate: ['role'],
  });

  const granted = new Set<string>();
  for (const permission of sensitivePermissions as any[]) {
    const owner = ROLE_PRECEDENCE.find((key) => roleIds[key] === permission.role?.id);
    const entitled = owner && PAYMENT_ROLES[owner].actions.includes(permission.action);
    if (!entitled) {
      await permissionQuery.delete({ where: { id: permission.id } });
    } else {
      granted.add(`${owner}:${permission.action}`);
    }
  }

  let created = 0;
  for (const key of ROLE_PRECEDENCE) {
    for (const action of PAYMENT_ROLES[key].actions) {
      if (granted.has(`${key}:${action}`)) continue;
      await permissionQuery.create({ data: { action, role: roleIds[key] } });
      created += 1;
    }
  }

  const userQuery = strapi.db.query('plugin::users-permissions.user');
  const users = await userQuery.findMany({ populate: ['role'] });
  let assigned = 0;
  for (const user of users as any[]) {
    const username = String(user.username || '').toLowerCase();
    const email = String(user.email || '').toLowerCase();
    const target = ROLE_PRECEDENCE.find(
      (key) => ROLE_ASSIGNMENTS[key].usernames.includes(username) || ROLE_ASSIGNMENTS[key].emails.includes(email)
    );
    if (target && user.role?.id !== roleIds[target]) {
      // Moving someone between payment roles (not the first assignment) is worth a look:
      // a typo in the env lists could take an administrator's access away.
      const previous = ROLE_PRECEDENCE.find((key) => roleIds[key] === user.role?.id);
      if (previous) {
        strapi.log.warn(`[payment-roles] ${user.username || user.email} moved from ${previous} to ${target} by the env role lists`);
      }
      await userQuery.update({ where: { id: user.id }, data: { role: roleIds[target] } });
      assigned += 1;
    }
  }

  strapi.log.info(
    `[payment-roles] public registration disabled; ${ROLE_PRECEDENCE.length} roles, ${actions.length} actions secured (${created} granted); ${assigned} user(s) assigned`
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
