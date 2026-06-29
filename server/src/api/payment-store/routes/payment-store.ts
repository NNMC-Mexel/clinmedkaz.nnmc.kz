export default {
  routes: [
    {
      method: 'GET',
      path: '/payment-store',
      handler: 'payment-store.read',
      config: {
        auth: false,
      },
    },
    {
      method: 'PUT',
      path: '/payment-store',
      handler: 'payment-store.write',
      config: {
        auth: false,
      },
    },
  ],
};
