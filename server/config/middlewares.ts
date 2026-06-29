import type { Core } from '@strapi/strapi';

const defaultCorsOrigins = [
  'https://clinmedkaz.nnmc.kz',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

function corsOrigins(env: Core.Config.Shared.ConfigParams['env']) {
  return env
    .array('CORS_ORIGINS', defaultCorsOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  ({ env }) => ({
    name: 'strapi::cors',
    config: {
      origin: corsOrigins(env),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Admin-Token', 'X-Payment-Service-Token'],
    },
  }),
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
