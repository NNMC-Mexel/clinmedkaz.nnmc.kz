import { config, halykCredentialsConfigured } from '../../../lib/config';

export default {
  async live(ctx: any) {
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { status: 'ok', service: 'clinmedkaz-payments', timestamp: new Date().toISOString() };
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
    const provider = halykCredentialsConfigured();
    const reconciliation = !config.isProduction || (config.halyk.statusSyncEnabled && config.halyk.reconciliationCronEnabled);
    const ready = database && provider && reconciliation;
    ctx.status = ready ? 200 : 503;
    ctx.body = {
      status: ready ? 'ready' : 'not_ready',
      checks: { database, paymentProvider: provider, reconciliation },
      timestamp: new Date().toISOString(),
    };
  },
};
