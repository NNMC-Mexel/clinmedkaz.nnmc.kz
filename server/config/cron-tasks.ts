import { config } from '../src/lib/config';
import { logger } from '../src/lib/logger';
import { reconcileActiveOrders } from '../src/lib/reconciliation';

export default {
  paymentReconciliation: {
    task: async () => {
      if (!config.halyk.reconciliationCronEnabled || !config.halyk.statusSyncEnabled) return;
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
};
