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
  ],
};
