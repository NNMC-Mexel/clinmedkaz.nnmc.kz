import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const halykEnv = process.env.HALYK_ENV === 'prod' ? 'prod' : 'test';
const publicationFeeUsd = Number(process.env.PUBLICATION_FEE_USD || 300);
const usdToKztRate = Number(process.env.USD_TO_KZT_RATE || 485.4);
const residentKztAmount = Math.round(publicationFeeUsd * usdToKztRate);

function env(name: string, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function parseAdminUsers(raw: string | undefined) {
  return String(raw || '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      if (i === -1) return null;
      return { username: pair.slice(0, i).trim(), password: pair.slice(i + 1) };
    })
    .filter((account) => account?.username && account?.password) as { username: string; password: string }[];
}

function buildAdminAccounts() {
  const accounts: { username: string; password: string }[] = [];
  const primaryUser = env('ADMIN_USERNAME', 'admin');
  const primaryPass = env('ADMIN_PASSWORD');
  if (primaryUser && primaryPass) accounts.push({ username: primaryUser, password: primaryPass });
  for (const extra of parseAdminUsers(process.env.ADMIN_USERS)) {
    if (!accounts.some((account) => account.username === extra.username)) accounts.push(extra);
  }
  return accounts;
}

export const config = {
  isProduction,
  baseUrl: env('BASE_URL', `http://localhost:${process.env.PORT || 1337}`),
  adminToken: env('ADMIN_TOKEN'),
  adminAccounts: buildAdminAccounts(),
  adminSessionSecret: env('ADMIN_SESSION_SECRET') || env('ADMIN_TOKEN') || env('APP_KEYS'),
  adminSessionTtlMs: Number(process.env.ADMIN_SESSION_TTL_HOURS || 12) * 60 * 60 * 1000,
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
