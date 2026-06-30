import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const halykEnv = process.env.HALYK_ENV === 'prod' ? 'prod' : 'test';
const publicationFeeUsd = Number(process.env.PUBLICATION_FEE_USD || 300);
const usdToKztRate = Number(process.env.USD_TO_KZT_RATE || 485.4);
const residentKztAmount = Math.round(publicationFeeUsd * usdToKztRate);
const productionFrontendUrl = 'https://clinmedkaz.nnmc.kz';
const productionBackendUrl = 'https://clinmedkazserver.nnmc.kz';

function env(name: string, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

export const config = {
  isProduction,
  baseUrl: env('BASE_URL', env('FRONTEND_URL', isProduction ? productionFrontendUrl : 'http://localhost:5173')),
  backendUrl: env('BACKEND_URL', env('STRAPI_URL', isProduction ? productionBackendUrl : `http://localhost:${process.env.PORT || 1337}`)),
  adminEmail: env('ADMIN_EMAIL', 'Nnmc.marketing@gmail.com'),
  publicationFeeDisplay: env('PUBLICATION_FEE_DISPLAY', '300 USD'),
  pricing: {
    publicationFeeUsd,
    usdToKztRate,
    residentKztAmount,
    residentCurrency: 'KZT',
    nonResidentAmount: publicationFeeUsd,
    nonResidentCurrency: 'USD',
  },
  halyk: {
    env: halykEnv,
    clientId: env('HALYK_CLIENT_ID'),
    clientSecret: env('HALYK_CLIENT_SECRET'),
    terminalId: env('HALYK_TERMINAL_ID'),
    postLinkSecret: env('HALYK_POSTLINK_SECRET'),
    oauthUrl:
      halykEnv === 'prod'
        ? 'https://epay-oauth.homebank.kz/oauth2/token'
        : 'https://test-epay-oauth.epayment.kz/oauth2/token',
    paymentJsUrl:
      halykEnv === 'prod'
        ? 'https://epay.homebank.kz/payform/payment-api.js'
        : 'https://test-epay.epayment.kz/payform/payment-api.js',
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
};

export function publicConfig() {
  return {
    publicationFeeDisplay: config.publicationFeeDisplay,
    pricing: config.pricing,
    business: config.business,
    bank: config.bank,
    halykPaymentJsUrl: config.halyk.paymentJsUrl,
  };
}
