// PDF payment receipt attached to the confirmation email and downloadable from the
// success page / admin panel. It confirms that the payment was received; it is not a
// tax invoice (ЭСФ) - those are issued by the NNMC accounting department.

import PDFDocument from 'pdfkit';
import { config, formatMoney } from './config';

const fonts = {
  regular: require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf'),
  bold: require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf'),
};

const copy = {
  ru: {
    title: 'Квитанция об оплате', number: '№', paid: 'ОПЛАЧЕНО',
    payee: 'Получатель', payer: 'Плательщик', payment: 'Платёж', name: 'Наименование',
    bin: 'БИН', address: 'Адрес', bank: 'Банк', bik: 'БИК', iban: 'ИИК (IBAN)', kbe: 'Кбе', contacts: 'Контакты',
    fullName: 'ФИО', email: 'Email', country: 'Страна',
    purpose: 'Назначение', purposeText: (title: string) => `Оплата публикации статьи «${title}» в журнале ClinMedKaz`,
    paidAt: 'Дата и время оплаты', method: 'Способ оплаты', card: 'Банковская карта', reference: 'Референс Halyk ePay',
    amount: 'Сумма', rateNote: (usd: string, rate: string) => `Справочно: ${usd} по курсу ${rate} ₸ за 1 USD`,
    footer: 'Документ сформирован автоматически и подтверждает получение оплаты. Не является счётом-фактурой.',
    generatedAt: 'Сформировано',
  },
  kk: {
    title: 'Төлем түбіртегі', number: '№', paid: 'ТӨЛЕНДІ',
    payee: 'Алушы', payer: 'Төлеуші', payment: 'Төлем', name: 'Атауы',
    bin: 'БСН', address: 'Мекенжай', bank: 'Банк', bik: 'БСК', iban: 'ЖСК (IBAN)', kbe: 'Кбе', contacts: 'Байланыс',
    fullName: 'Т.А.Ә.', email: 'Email', country: 'Ел',
    purpose: 'Мақсаты', purposeText: (title: string) => `ClinMedKaz журналында «${title}» мақаласын жариялау төлемі`,
    paidAt: 'Төлем күні мен уақыты', method: 'Төлем тәсілі', card: 'Банк картасы', reference: 'Halyk ePay референсі',
    amount: 'Сома', rateNote: (usd: string, rate: string) => `Анықтама: 1 USD үшін ${rate} ₸ бағамы бойынша ${usd}`,
    footer: 'Құжат автоматты түрде жасалды және төлемнің қабылданғанын растайды. Шот-фактура болып табылмайды.',
    generatedAt: 'Жасалды',
  },
  en: {
    title: 'Payment receipt', number: 'No.', paid: 'PAID',
    payee: 'Payee', payer: 'Payer', payment: 'Payment', name: 'Name',
    bin: 'BIN', address: 'Address', bank: 'Bank', bik: 'BIC', iban: 'IBAN', kbe: 'Beneficiary code (KBE)', contacts: 'Contacts',
    fullName: 'Full name', email: 'Email', country: 'Country',
    purpose: 'Purpose', purposeText: (title: string) => `Publication fee for the article "${title}" in ClinMedKaz journal`,
    paidAt: 'Payment date and time', method: 'Payment method', card: 'Bank card', reference: 'Halyk ePay reference',
    amount: 'Amount', rateNote: (usd: string, rate: string) => `For reference: ${usd} at ${rate} KZT per 1 USD`,
    footer: 'This document was generated automatically and confirms receipt of payment. It is not a tax invoice.',
    generatedAt: 'Generated',
  },
} as const;

const locales = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-GB' } as const;

function language(value: unknown): keyof typeof copy {
  return value === 'kk' || value === 'en' ? value : 'ru';
}

function formatDateTime(value: unknown, lang: keyof typeof copy) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locales[lang], {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Almaty',
  }).format(date);
}

export function receiptFileName(order: Record<string, any>) {
  return `clinmedkaz-receipt-${String(order.invoiceId || order.id).replace(/[^\w-]/g, '')}.pdf`;
}

export function buildReceiptPdf(order: Record<string, any>): Promise<Buffer> {
  const lang = language(order.lang);
  const t = copy[lang];
  const { business, bank } = config;

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: `${t.title} ${t.number} ${order.invoiceId}`, Author: business.name, Subject: 'ClinMedKaz' },
  });
  doc.registerFont('regular', fonts.regular);
  doc.registerFont('bold', fonts.bold);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const labelWidth = 150;
  const ink = '#131a2b';
  const muted = '#5f6c83';
  const line = '#dfe6ee';

  // Header band
  doc.rect(0, 0, doc.page.width, 90).fill(ink);
  doc.fillColor('#ffffff').font('bold').fontSize(22).text('ClinMedKaz', left, 32);
  doc.font('regular').fontSize(10).fillColor('#c9d2e0').text(business.name, left, 60, { width: width - 120 });
  doc.roundedRect(left + width - 100, 34, 100, 26, 13).fill('#dff3ec');
  doc.fillColor('#087f68').font('bold').fontSize(11).text(t.paid, left + width - 100, 41, { width: 100, align: 'center' });

  doc.fillColor(ink).font('bold').fontSize(20).text(`${t.title} ${t.number} ${order.invoiceId}`, left, 120, { width });
  doc.moveDown(0.3);
  doc.font('regular').fontSize(10).fillColor(muted).text(formatDateTime(order.paymentReceivedAt, lang), { width });

  function section(title: string, rows: Array<[string, unknown]>) {
    doc.moveDown(0.9);
    doc.font('bold').fontSize(11.5).fillColor(ink).text(title.toUpperCase(), left, doc.y, { width, characterSpacing: 0.5 });
    doc.moveDown(0.4);
    for (const [label, value] of rows) {
      const text = String(value ?? '').trim();
      if (!text) continue;
      const y = doc.y;
      doc.moveTo(left, y).lineTo(left + width, y).lineWidth(0.5).strokeColor(line).stroke();
      doc.font('regular').fontSize(9.5).fillColor(muted).text(label, left, y + 5, { width: labelWidth - 10 });
      const labelBottom = doc.y;
      doc.font('regular').fontSize(10.5).fillColor(ink).text(text, left + labelWidth, y + 5, { width: width - labelWidth });
      doc.y = Math.max(doc.y, labelBottom) + 5;
    }
  }

  section(t.payee, [
    [t.name, business.name],
    [t.bin, business.bin],
    [t.address, [business.city, business.legalAddress].filter(Boolean).join(', ')],
    [t.bank, bank.name],
    [t.bik, bank.bik],
    [t.iban, bank.iban],
    [t.kbe, business.kbe],
    [t.contacts, [business.supportPhone, business.supportEmail].filter(Boolean).join(', ')],
  ]);

  section(t.payer, [
    [t.fullName, order.fullName],
    [t.email, order.email],
    [t.country, order.country],
  ]);

  section(t.payment, [
    [t.purpose, t.purposeText(String(order.articleTitle || ''))],
    [t.paidAt, formatDateTime(order.paymentReceivedAt, lang)],
    [t.method, `${t.card}${order.cardMask ? ` ${order.cardMask}` : ''} · Halyk ePay`],
    [t.reference, order.halykReference],
  ]);

  // Total
  doc.moveDown(0.9);
  const totalTop = doc.y;
  doc.roundedRect(left, totalTop, width, 64, 10).fill('#f3f6fa');
  doc.fillColor(muted).font('regular').fontSize(10).text(t.amount, left + 18, totalTop + 14);
  doc.fillColor(ink).font('bold').fontSize(20).text(formatMoney(order.amount, order.currency || 'KZT'), left + 18, totalTop + 30, {
    width: width - 36,
  });
  doc.y = totalTop + 64;
  const rate = Number(order.exchangeRate);
  if (order.currency === 'KZT' && Number.isFinite(rate) && rate > 0) {
    const usd = formatMoney(Math.round((Number(order.amount) / rate) * 100) / 100, 'USD');
    const rateText = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(rate);
    doc.moveDown(0.5);
    doc.font('regular').fontSize(9).fillColor(muted).text(t.rateNote(usd, rateText), left, doc.y, { width });
  }

  // Footer pinned to the bottom of the page; dropping the bottom margin keeps PDFKit
  // from pushing it onto a second page.
  const footerTop = Math.max(doc.y + 16, doc.page.height - 78);
  doc.page.margins.bottom = 0;
  doc.moveTo(left, footerTop).lineTo(left + width, footerTop).lineWidth(0.5).strokeColor(line).stroke();
  doc.font('regular').fontSize(8.5).fillColor(muted).text(t.footer, left, footerTop + 10, { width });
  doc.moveDown(0.3);
  doc.text(`${t.generatedAt}: ${formatDateTime(new Date().toISOString(), lang)} · ${config.baseUrl}`, { width });

  doc.end();
  return done;
}
