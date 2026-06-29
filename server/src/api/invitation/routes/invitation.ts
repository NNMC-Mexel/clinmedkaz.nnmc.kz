export default {
  routes: [
    {
      method: 'POST',
      path: '/invitations',
      handler: 'invitation.createPaymentInvitation',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/invitations/:id/resend',
      handler: 'invitation.resend',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/invitations/:id/cancel',
      handler: 'invitation.cancel',
      config: { auth: false },
    },
  ],
};
