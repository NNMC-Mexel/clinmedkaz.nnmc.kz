import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const halykEnv = process.env.HALYK_ENV === "prod" ? "prod" : "test";
const publicationFeeUsd = Number(process.env.PUBLICATION_FEE_USD || 300);
const usdToKztRate = Number(process.env.USD_TO_KZT_RATE || 485.4);
const residentKztAmount = Math.round(publicationFeeUsd * usdToKztRate);

export const config = {
  isProduction,
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  adminToken: process.env.ADMIN_TOKEN || "change-me-long-random-token",
  adminEmail: process.env.ADMIN_EMAIL || "Nnmc.marketing@gmail.com",
  publicationFeeDisplay: process.env.PUBLICATION_FEE_DISPLAY || "300 USD",
  pricing: {
    publicationFeeUsd,
    usdToKztRate,
    residentKztAmount,
    residentCurrency: "KZT",
    nonResidentAmount: publicationFeeUsd,
    nonResidentCurrency: "USD"
  },
  halyk: {
    env: halykEnv,
    clientId: process.env.HALYK_CLIENT_ID || "test",
    clientSecret:
      process.env.HALYK_CLIENT_SECRET || "yF587AV9Ms94qN2QShFzVR3vFnWkhjbAK3sG",
    terminalId:
      process.env.HALYK_TERMINAL_ID || "67e34d63-102f-4bd1-898e-370781d0074d",
    oauthUrl:
      halykEnv === "prod"
        ? "https://epay-oauth.homebank.kz/oauth2/token"
        : "https://test-epay-oauth.epayment.kz/oauth2/token",
    paymentJsUrl:
      halykEnv === "prod"
        ? "https://epay.homebank.kz/payform/payment-api.js"
        : "https://test-epay.epayment.kz/payform/payment-api.js"
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || "ClinMedKaz payments <no-reply@clinmedkaz.org>"
  },
  business: {
    name: process.env.BUSINESS_NAME || "АО «Национальный научный медицинский центр»",
    country: process.env.BUSINESS_COUNTRY || "Kazakhstan",
    city: process.env.BUSINESS_CITY || "Astana",
    legalAddress: process.env.BUSINESS_LEGAL_ADDRESS || "пр. Абылай хана, 42",
    actualAddress: process.env.BUSINESS_ACTUAL_ADDRESS || "пр. Абылай хана, 42",
    bin: process.env.BUSINESS_BIN || "000640000596",
    kbe: process.env.BUSINESS_KBE || "16",
    workHours: process.env.BUSINESS_WORK_HOURS || "Mon-Fri 09:00-18:00",
    supportPhone: process.env.SUPPORT_PHONE || "+7 (7172) 57-74-40",
    supportEmail: process.env.SUPPORT_EMAIL || "Nnmc.marketing@gmail.com",
    chairmanName: process.env.CHAIRMAN_NAME || "Байгенжин Абай Кабатаевич"
  },
  bank: {
    name: process.env.BANK_NAME || "АО «Народный банк»",
    bik: process.env.BANK_BIK || "HSBKKZKX",
    kbe: process.env.BANK_KBE || "14",
    iban: process.env.BANK_IBAN || "KZ806017111000000485"
  }
};
