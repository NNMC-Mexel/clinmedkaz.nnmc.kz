import type { Core } from '@strapi/strapi';

const defaultCorsOrigins = [
  'https://clinmedkaz.nnmc.kz',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

function corsOrigins(env: Core.Config.Shared.ConfigParams['env']) {
  return env('CORS_ORIGINS', defaultCorsOrigins.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: (ctx: any) => {
        const requestOrigin = ctx.get('Origin');
        const allowedOrigins = corsOrigins(env);
        if (!requestOrigin) return allowedOrigins[0] || '*';
        if (allowedOrigins.includes('*')) return requestOrigin;
        return allowedOrigins.includes(requestOrigin) ? requestOrigin : '';
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Admin-Token', 'X-Payment-Service-Token'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
