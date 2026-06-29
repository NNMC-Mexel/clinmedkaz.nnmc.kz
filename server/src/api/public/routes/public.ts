export default {
  routes: [
    {
      method: 'GET',
      path: '/public/context',
      handler: 'public.context',
      config: { auth: false },
    },
  ],
};
