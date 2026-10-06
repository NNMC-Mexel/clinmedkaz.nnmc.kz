export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/session',
      handler: 'admin-api.session',
      config: { auth: { scope: ['api::admin-api.admin-api.session'] } },
    },
    {
      method: 'GET',
      path: '/admin/orders',
      handler: 'admin-api.orders',
      config: { auth: { scope: ['api::admin-api.admin-api.orders'] } },
    },
    {
      method: 'PATCH',
      path: '/admin/orders/:id',
      handler: 'admin-api.updateOrder',
      config: { auth: { scope: ['api::admin-api.admin-api.updateOrder'] } },
    },
    {
      method: 'PUT',
      path: '/admin/pricing',
      handler: 'admin-api.updatePricing',
      config: { auth: { scope: ['api::admin-api.admin-api.updatePricing'] } },
    },
    {
      method: 'GET',
      path: '/admin/exchange-rate',
      handler: 'admin-api.exchangeRate',
      config: { auth: { scope: ['api::admin-api.admin-api.exchangeRate'] } },
    },
    {
      method: 'POST',
      path: '/admin/reconcile',
      handler: 'admin-api.reconcile',
      config: { auth: { scope: ['api::admin-api.admin-api.reconcile'] } },
    },
    {
      method: 'GET',
      path: '/admin/orders/export.csv',
      handler: 'admin-api.exportCsv',
      config: { auth: { scope: ['api::admin-api.admin-api.exportCsv'] } },
    },
    {
      method: 'GET',
      path: '/admin/orders/:id/receipt.pdf',
      handler: 'admin-api.receipt',
      config: { auth: { scope: ['api::admin-api.admin-api.receipt'] } },
    },
  ],
};
