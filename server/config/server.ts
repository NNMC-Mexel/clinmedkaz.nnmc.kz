import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('BACKEND_URL', env('STRAPI_URL', env('NODE_ENV') === 'production' ? 'https://clinmedkazserver.nnmc.kz' : 'http://localhost:1337')),
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;
