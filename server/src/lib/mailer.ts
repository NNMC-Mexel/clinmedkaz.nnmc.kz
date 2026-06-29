import nodemailer from 'nodemailer';
import { config } from './config';
import { logger } from './logger';

let transporter: any;

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user && config.smtp.pass ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendMail({ to, subject, html, text }, { retries = 2 } = {}) {
  const mail = { from: config.smtp.from, to, subject, html, text };
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    logger.info('Email disabled (no SMTP host) - logging instead', { to, subject });
    return { delivered: false, queued: false };
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await activeTransporter.sendMail(mail);
      return { delivered: true };
    } catch (error) {
      lastError = error as Error;
      logger.warn('Email send failed', { to, subject, attempt, error: lastError.message });
      if (attempt < retries) await delay(500 * (attempt + 1));
    }
  }

  logger.error('Email delivery gave up after retries', { to, subject, error: lastError?.message });
  return { delivered: false, error: lastError?.message || 'send failed' };
}
