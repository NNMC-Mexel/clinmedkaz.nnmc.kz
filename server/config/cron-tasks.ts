import { config } from '../src/lib/config';
import { logger } from '../src/lib/logger';
import { refreshOfficialRate } from '../src/lib/pricing';
import { reconcileActiveOrders } from '../src/lib/reconciliation';

export default {
  paymentReconciliation: {
    task: async () => {
      if (!config.payments.enabled || !config.halyk.reconciliationCronEnabled || !config.halyk.statusSyncEnabled) return;
      try {
        const result = await reconcileActiveOrders(100);
        logger.info('Scheduled payment reconciliation completed', result);
      } catch (error) {
        logger.error('Scheduled payment reconciliation failed', { error: String(error) });
      }
    },
    options: {
      rule: '*/5 * * * *',
    },
  },
  exchangeRateRefresh: {
    // The National Bank sets the rate once a day; hourly runs pick it up soon after midnight
    // and retry on their own if the bank was unreachable. No-op unless pricing is in auto mode.
    task: async () => {
      try {
        await refreshOfficialRate();
      } catch (error) {
        logger.warn('Scheduled exchange rate refresh failed', { error: String(error) });
      }
    },
    options: {
      rule: '5 * * * *',
    },
  },
};
