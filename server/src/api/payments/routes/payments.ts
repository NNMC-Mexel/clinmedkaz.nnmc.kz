export default {
  routes: [
    {
      method: 'POST',
      path: '/payments',
      handler: 'payments.create',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/payments/:id/payment-object',
      handler: 'payments.paymentObject',
      config: { auth: false },
    },
  ],
};
