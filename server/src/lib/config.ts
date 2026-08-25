import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const halykEnv = process.env.HALYK_ENV === 'prod' ? 'prod' : 'test';
const usdToKztRate = Number(process.env.USD_TO_KZT_RATE || 485.4);
// KZT is the base currency: it is the amount actually charged through Halyk ePay.
// PUBLICATION_FEE_KZT wins; otherwise the legacy USD fee is converted once at boot.
const residentKztAmount = Math.round(
  Number(process.env.PUBLICATION_FEE_KZT) || Number(process.env.PUBLICATION_FEE_USD || 300) * usdToKztRate
);
const productionFrontendUrl = 'https://clinmedkaz.nnmc.kz';
const productionBackendUrl = 'https://clinmedkazserver.nnmc.kz';

function env(name: string, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function csvEnv(name: string, fallback = '') {
  return env(name, fallback)
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isConfiguredSecret(value: string) {
  return Boolean(value) && !value.toLowerCase().startsWith('change-me');
}

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const config = {
  isProduction,
  baseUrl: env('BASE_URL', env('FRONTEND_URL', isProduction ? productionFrontendUrl : 'http://localhost:5173')),
  backendUrl: env('BACKEND_URL', env('STRAPI_URL', isProduction ? productionBackendUrl : `http://localhost:${process.env.PORT || 1337}`)),
  adminEmail: env('ADMIN_EMAIL', 'Nnmc.marketing@gmail.com'),
  paymentAdmin: {
    roleType: 'payment-admin',
    usernames: csvEnv('PAYMENT_ADMIN_USERS', env('ADMIN_USERS', env('ADMIN_USERNAME'))),
    emails: csvEnv('PAYMENT_ADMIN_EMAILS'),
  },
  // Fallback used until an admin saves a price (see lib/pricing.ts).
  pricingDefaults: {
    residentKztAmount,
    usdToKztRate,
  },
  halyk: {
    env: halykEnv,
    clientId: env('HALYK_CLIENT_ID'),
    clientSecret: env('HALYK_CLIENT_SECRET'),
    terminalId: env('HALYK_TERMINAL_ID'),
    oauthUrl:
      halykEnv === 'prod'
        ? 'https://epay-oauth.homebank.kz/oauth2/token'
        : 'https://test-epay-oauth.epayment.kz/oauth2/token',
    paymentJsUrl:
      halykEnv === 'prod'
        ? 'https://epay.homebank.kz/payform/payment-api.js'
        : 'https://test-epay.epayment.kz/payform/payment-api.js',
    statusUrl:
      halykEnv === 'prod'
        ? 'https://epay-api.homebank.kz/check-status/payment/transaction'
        : 'https://test-epay-api.epayment.kz/check-status/payment/transaction',
    statusSyncEnabled:
      process.env.HALYK_STATUS_SYNC_ENABLED === undefined
        ? isProduction
        : process.env.HALYK_STATUS_SYNC_ENABLED === 'true',
    reconciliationCronEnabled:
      process.env.PAYMENT_RECONCILIATION_CRON_ENABLED === undefined
        ? isProduction
        : process.env.PAYMENT_RECONCILIATION_CRON_ENABLED === 'true',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: env('MAIL_FROM', 'ClinMedKaz payments <no-reply@clinmedkaz.org>'),
  },
  business: {
    name: env('BUSINESS_NAME', 'АО «Национальный научный медицинский центр»'),
    country: env('BUSINESS_COUNTRY', 'Kazakhstan'),
    city: env('BUSINESS_CITY', 'Astana'),
    legalAddress: env('BUSINESS_LEGAL_ADDRESS', 'пр. Абылай хана, 42'),
    actualAddress: env('BUSINESS_ACTUAL_ADDRESS', 'пр. Абылай хана, 42'),
    bin: env('BUSINESS_BIN', '000640000596'),
    kbe: env('BUSINESS_KBE', '16'),
    workHours: env('BUSINESS_WORK_HOURS', 'Mon-Fri 09:00-18:00'),
    supportPhone: env('SUPPORT_PHONE', '+7 (7172) 57-74-40'),
    supportEmail: env('SUPPORT_EMAIL', 'Nnmc.marketing@gmail.com'),
    chairmanName: env('CHAIRMAN_NAME', 'Байгенжин Абай Кабатаевич'),
  },
  bank: {
    name: env('BANK_NAME', 'АО «Народный банк»'),
    bik: env('BANK_BIK', 'HSBKKZKX'),
    kbe: env('BANK_KBE', '14'),
    iban: env('BANK_IBAN', 'KZ806017111000000485'),
  },
  runtime: {
    databaseClient: env('DATABASE_CLIENT', 'sqlite'),
    databaseConfigured: Boolean(process.env.DATABASE_URL) || Boolean(process.env.DATABASE_HOST && process.env.DATABASE_NAME),
    corsOrigins: csv(env('CORS_ORIGINS', isProduction ? productionFrontendUrl : 'http://localhost:5173')),
    appKeys: csv(env('APP_KEYS')),
    adminJwtSecret: env('ADMIN_JWT_SECRET'),
    apiTokenSalt: env('API_TOKEN_SALT'),
    transferTokenSalt: env('TRANSFER_TOKEN_SALT'),
    encryptionKey: env('ENCRYPTION_KEY'),
    usersPermissionsJwtSecret: env('JWT_SECRET'),
  },
};

export function halykCredentialsConfigured() {
  return [config.halyk.clientId, config.halyk.clientSecret, config.halyk.terminalId].every(isConfiguredSecret);
}

export function productionConfigurationErrors(candidate: typeof config = config) {
  const errors: string[] = [];
  if (candidate.halyk.env !== 'prod') errors.push('HALYK_ENV must be prod.');
  if (![candidate.halyk.clientId, candidate.halyk.clientSecret, candidate.halyk.terminalId].every(isConfiguredSecret)) {
    errors.push('HALYK client credentials and terminal ID must be configured.');
  }
  if (!candidate.halyk.statusSyncEnabled) errors.push('HALYK_STATUS_SYNC_ENABLED must be true.');
  if (!candidate.halyk.reconciliationCronEnabled) errors.push('PAYMENT_RECONCILIATION_CRON_ENABLED must be true.');
  if (!isHttpsUrl(candidate.baseUrl)) errors.push('FRONTEND_URL/BASE_URL must use HTTPS.');
  if (!isHttpsUrl(candidate.backendUrl)) errors.push('BACKEND_URL/STRAPI_URL must use HTTPS.');
  if (candidate.runtime.databaseClient !== 'postgres' || !candidate.runtime.databaseConfigured) {
    errors.push('Production must use a configured PostgreSQL database.');
  }
  if (!candidate.smtp.host || !candidate.smtp.user || !candidate.smtp.pass) {
    errors.push('SMTP_HOST, SMTP_USER and SMTP_PASS must be configured.');
  }
  if (candidate.paymentAdmin.usernames.length === 0 && candidate.paymentAdmin.emails.length === 0) {
    errors.push('Configure PAYMENT_ADMIN_USERS or PAYMENT_ADMIN_EMAILS.');
  }
  const secrets = [
    ...candidate.runtime.appKeys,
    candidate.runtime.adminJwtSecret,
    candidate.runtime.apiTokenSalt,
    candidate.runtime.transferTokenSalt,
    candidate.runtime.encryptionKey,
    candidate.runtime.usersPermissionsJwtSecret,
  ];
  if (candidate.runtime.appKeys.length < 2 || !secrets.every(isConfiguredSecret)) {
    errors.push('All Strapi secrets must be strong non-placeholder values and APP_KEYS must contain at least two keys.');
  }
  if (candidate.runtime.corsOrigins.length === 0 || candidate.runtime.corsOrigins.some((origin) => !isHttpsUrl(origin))) {
    errors.push('CORS_ORIGINS must contain only explicit HTTPS origins.');
  } else {
    const frontendOrigin = new URL(candidate.baseUrl).origin;
    if (!candidate.runtime.corsOrigins.includes(frontendOrigin)) errors.push('CORS_ORIGINS must include the frontend origin.');
  }
  return errors;
}

export function assertProductionSecurityConfig() {
  if (!config.isProduction) return;
  const errors = productionConfigurationErrors();
  if (errors.length) throw new Error(`Unsafe production configuration:\n- ${errors.join('\n- ')}`);
}

export function formatMoney(amount: unknown, currency: string) {
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: currency === 'KZT' ? 0 : 2,
  }).format(Number(amount || 0));
  return `${formatted} ${currency}`;
}

type PublicPricing = {
  residentKztAmount: number;
  nonResidentAmount: number;
};

export function publicConfig(pricing: PublicPricing & Record<string, any>) {
  return {
    // KZT first: the acquirer (Halyk ePay) settles in tenge, so tenge is the headline price.
    publicationFeeDisplay: formatMoney(pricing.residentKztAmount, 'KZT'),
    publicationFeeDisplaySecondary: formatMoney(pricing.nonResidentAmount, 'USD'),
    pricing,
    business: config.business,
    bank: config.bank,
    halykPaymentJsUrl: config.halyk.paymentJsUrl,
  };
}
