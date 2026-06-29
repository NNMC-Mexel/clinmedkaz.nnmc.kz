export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/session',
      handler: 'admin-api.session',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/admin/login',
      handler: 'admin-api.login',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/admin/logout',
      handler: 'admin-api.logout',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/admin/orders',
      handler: 'admin-api.orders',
      config: { auth: false },
    },
    {
      method: 'PATCH',
      path: '/admin/orders/:id',
      handler: 'admin-api.updateOrder',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/admin/orders/export.csv',
      handler: 'admin-api.exportCsv',
      config: { auth: false },
    },
  ],
};
