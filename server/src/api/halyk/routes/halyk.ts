export default {
  routes: [
    {
      method: 'POST',
      path: '/halyk/postlink',
      handler: 'halyk.postlink',
      config: { auth: false },
    },
  ],
};
