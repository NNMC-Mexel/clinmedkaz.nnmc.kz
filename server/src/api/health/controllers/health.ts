import { config, halykCredentialsConfigured } from '../../../lib/config';

export default {
  async live(ctx: any) {
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      status: 'ok',
      service: 'clinmedkaz-payments',
      mode: config.payments.enabled ? 'full' : 'degraded',
      timestamp: new Date().toISOString(),
    };
  },

  async ready(ctx: any) {
    ctx.set('Cache-Control', 'no-store');
    let database = false;
    try {
      await strapi.db.connection.raw('select 1');
      database = true;
    } catch {
      database = false;
    }
    const providerConfigured = halykCredentialsConfigured();
    const reconciliationConfigured = config.halyk.statusSyncEnabled && config.halyk.reconciliationCronEnabled;
    const provider = !config.payments.enabled || providerConfigured;
    const reconciliation = !config.payments.enabled || !config.isProduction || reconciliationConfigured;
    const ready = database && provider && reconciliation;
    ctx.status = ready ? 200 : 503;
    ctx.body = {
      status: ready ? 'ready' : 'not_ready',
      mode: config.payments.enabled ? 'full' : 'degraded',
      checks: { database, paymentProvider: provider, reconciliation },
      payments: {
        enabled: config.payments.enabled,
        providerConfigured,
        reconciliationConfigured,
      },
      timestamp: new Date().toISOString(),
    };
  },
};
