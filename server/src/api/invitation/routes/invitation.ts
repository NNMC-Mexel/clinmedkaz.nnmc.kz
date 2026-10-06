export default {
  routes: [
    {
      method: 'POST',
      path: '/invitations',
      handler: 'invitation.createPaymentInvitation',
      config: { auth: { scope: ['api::invitation.invitation.createPaymentInvitation'] } },
    },
    {
      method: 'POST',
      path: '/invitations/:id/resend',
      handler: 'invitation.resend',
      config: { auth: { scope: ['api::invitation.invitation.resend'] } },
    },
    {
      method: 'POST',
      path: '/invitations/:id/opened',
      handler: 'invitation.opened',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/invitations/:id/cancel',
      handler: 'invitation.cancel',
      config: { auth: { scope: ['api::invitation.invitation.cancel'] } },
    },
  ],
};
