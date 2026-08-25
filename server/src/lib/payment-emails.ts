import { config, formatMoney } from './config';
import { sendMail } from './mailer';

const copy = {
  ru: {
    adminSubject: 'ClinMedKaz: получена оплата', payerSubject: 'ClinMedKaz: подтверждение оплаты',
    title: 'Оплата публикации получена', invoice: 'Инвойс', article: 'Статья', amount: 'Сумма',
    reference: 'Референс Halyk', lead: 'Спасибо. Оплата подтверждена, статья передана на следующий этап публикации.',
  },
  kk: {
    adminSubject: 'ClinMedKaz: төлем қабылданды', payerSubject: 'ClinMedKaz: төлем растамасы',
    title: 'Жарияланым төлемі қабылданды', invoice: 'Инвойс', article: 'Мақала', amount: 'Сома',
    reference: 'Halyk референсі', lead: 'Рақмет. Төлем расталды, мақала жариялаудың келесі кезеңіне жіберілді.',
  },
  en: {
    adminSubject: 'ClinMedKaz: payment received', payerSubject: 'ClinMedKaz: payment confirmation',
    title: 'Publication payment received', invoice: 'Invoice', article: 'Article', amount: 'Amount',
    reference: 'Halyk reference', lead: 'Thank you. The payment has been confirmed and the article is ready for the next publication step.',
  },
} as const;

function language(value: unknown): keyof typeof copy {
  return value === 'kk' || value === 'en' ? value : 'ru';
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function buildPaymentEmails(order: Record<string, any>, payload: Record<string, any> = {}) {
  const lang = language(order.lang);
  const t = copy[lang];
  const amount = formatMoney(order.amount, order.currency || 'KZT');
  const reference = String(payload.reference || order.halykReference || '').trim();
  const rows: Array<[string, unknown]> = [[t.invoice, order.invoiceId], [t.article, order.articleTitle], [t.amount, amount]];
  const receiptHtml = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#131a2b"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dfe6ee;border-radius:18px"><tr><td style="padding:24px 32px;background:#131a2b;color:#fff;border-radius:18px 18px 0 0;font-size:20px;font-weight:700">ClinMedKaz</td></tr><tr><td style="padding:32px"><div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#dff3ec;color:#087f68;font-size:12px;font-weight:700">✓ ${escapeHtml(t.title)}</div><h1 style="margin:20px 0 12px;font-size:28px;line-height:1.2">${escapeHtml(t.title)}</h1><p style="margin:0 0 24px;color:#5f6c83;line-height:1.6">${escapeHtml(t.lead)}</p>${rows.map(([label, value]) => `<div style="padding:12px 0;border-top:1px solid #e1e7ef"><div style="color:#728097;font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(label)}</div><div style="padding-top:5px;font-size:16px;font-weight:700;word-break:break-word">${escapeHtml(value)}</div></div>`).join('')}</td></tr></table></td></tr></table></body></html>`;
  const receiptText = `${t.title}\n\n${t.lead}\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}`;
  const adminRows: Array<[string, unknown]> = reference ? [...rows, [t.reference, reference]] : rows;
  const adminText = `${t.title}\n\n${adminRows.map(([label, value]) => `${label}: ${value}`).join('\n')}`;
  const adminHtml = `<div style="font-family:Arial,Helvetica,sans-serif;color:#131a2b"><h2>${escapeHtml(t.title)}</h2>${adminRows.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`).join('')}</div>`;
  return {
    payer: { subject: t.payerSubject, text: receiptText, html: receiptHtml },
    admin: { subject: `${t.adminSubject}: ${order.invoiceId}`, text: adminText, html: adminHtml },
  };
}

export async function sendPaymentEmails(order: Record<string, any>, payload: Record<string, any> = {}) {
  const emails = buildPaymentEmails(order, payload);
  return Promise.all([sendMail({ to: config.adminEmail, ...emails.admin }), sendMail({ to: order.email, ...emails.payer })]);
}
