import { config, formatMoney } from './config';

type Invitation = Record<string, any>;

const invitationCopy = {
  ru: {
    documentLanguage: 'ru',
    subject: 'Статья принята — оплата публикации | ClinMedKaz',
    preheader: 'Ваша статья принята. Завершите оплату публикации по персональной ссылке.',
    brandCaption: 'Clinical Medicine of Kazakhstan',
    status: 'Статья принята',
    greeting: (name: string) => (name ? `Здравствуйте, ${name}!` : 'Здравствуйте!'),
    title: 'Ваша статья принята к публикации',
    lead: 'Редакция ClinMedKaz завершила рассмотрение статьи. Чтобы продолжить публикацию, оплатите редакционно-издательские услуги по персональной ссылке.',
    articleLabel: 'Принятая статья',
    feeLabel: 'Стоимость публикации',
    residentLabel: 'Для резидентов Казахстана',
    nonResidentLabel: 'Для нерезидентов',
    customLabel: 'Индивидуальная стоимость',
    customFeeHint: 'Для этой персональной ссылки редакция установила специальную стоимость.',
    feeHint: 'Итоговая сумма определяется после выбора резидентства.',
    button: 'Перейти к оплате',
    securePayment: 'Оплата откроется на защищённой странице Halyk ePay.',
    nextTitle: 'Что произойдёт дальше',
    steps: ['Проверьте данные автора', 'Выберите резидентство и оплатите', 'Получите подтверждение оплаты'],
    linkHint: 'Если кнопка не открывается, скопируйте эту ссылку в браузер:',
    personalLink: 'Ссылка персональная — не пересылайте её другим людям.',
    help: 'Нужна помощь?',
    support: 'Свяжитесь с редакцией:',
    website: 'Сайт журнала',
    footerNote: 'Это служебное письмо об оплате публикации. Вы получили его, потому что для вашей статьи была создана персональная ссылка.',
  },
  kk: {
    documentLanguage: 'kk',
    subject: 'Мақала қабылданды — жарияланым ақысын төлеу | ClinMedKaz',
    preheader: 'Мақалаңыз қабылданды. Жеке сілтеме арқылы жарияланым ақысын төлеңіз.',
    brandCaption: 'Clinical Medicine of Kazakhstan',
    status: 'Мақала қабылданды',
    greeting: (name: string) => (name ? `Сәлеметсіз бе, ${name}!` : 'Сәлеметсіз бе!'),
    title: 'Мақалаңыз жариялауға қабылданды',
    lead: 'ClinMedKaz редакциясы мақаланы қарауды аяқтады. Жариялау процесін жалғастыру үшін жеке сілтеме арқылы редакциялық-баспа қызметтерінің ақысын төлеңіз.',
    articleLabel: 'Қабылданған мақала',
    feeLabel: 'Жарияланым құны',
    residentLabel: 'Қазақстан резиденттері үшін',
    nonResidentLabel: 'Бейрезиденттер үшін',
    customLabel: 'Жеке баға',
    customFeeHint: 'Редакция осы жеке сілтеме үшін арнайы баға белгіледі.',
    feeHint: 'Қорытынды сома резиденттік таңдалғаннан кейін анықталады.',
    button: 'Төлемге өту',
    securePayment: 'Төлем Halyk ePay қорғалған бетінде ашылады.',
    nextTitle: 'Әрі қарай не болады',
    steps: ['Автор деректерін тексеріңіз', 'Резиденттікті таңдап, төлем жасаңыз', 'Төлем растамасын алыңыз'],
    linkHint: 'Егер түйме ашылмаса, мына сілтемені браузерге көшіріңіз:',
    personalLink: 'Бұл жеке сілтеме — оны басқа адамдарға жібермеңіз.',
    help: 'Көмек керек пе?',
    support: 'Редакциямен байланысыңыз:',
    website: 'Журнал сайты',
    footerNote: 'Бұл жарияланым төлемі туралы қызметтік хат. Ол мақалаңыз үшін жеке сілтеме жасалғандықтан жіберілді.',
  },
  en: {
    documentLanguage: 'en',
    subject: 'Article accepted — publication payment | ClinMedKaz',
    preheader: 'Your article has been accepted. Complete the publication payment using your personal link.',
    brandCaption: 'Clinical Medicine of Kazakhstan',
    status: 'Article accepted',
    greeting: (name: string) => (name ? `Hello, ${name}!` : 'Hello!'),
    title: 'Your article has been accepted for publication',
    lead: 'The ClinMedKaz editorial team has completed its review. To continue with publication, please pay the editorial and publishing fee using your personal link.',
    articleLabel: 'Accepted article',
    feeLabel: 'Publication fee',
    residentLabel: 'For Kazakhstan residents',
    nonResidentLabel: 'For non-residents',
    customLabel: 'Individual fee',
    customFeeHint: 'The editorial team set a special fee for this personal link.',
    feeHint: 'The final amount is determined after you select your residency.',
    button: 'Proceed to payment',
    securePayment: 'Payment opens on the secure Halyk ePay page.',
    nextTitle: 'What happens next',
    steps: ['Review the author details', 'Select residency and pay', 'Receive payment confirmation'],
    linkHint: 'If the button does not open, copy this link into your browser:',
    personalLink: 'This link is personal. Please do not share it with anyone else.',
    help: 'Need help?',
    support: 'Contact the editorial team:',
    website: 'Journal website',
    footerNote: 'This is a service email about publication payment. You received it because a personal link was created for your article.',
  },
} as const;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function oneLine(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function emailLanguage(value: unknown): keyof typeof invitationCopy {
  return value === 'kk' || value === 'en' ? value : 'ru';
}

function websiteUrl() {
  try {
    return new URL(config.baseUrl).origin;
  } catch {
    return config.baseUrl;
  }
}

export function buildInvitationEmail(invitation: Invitation, link: string) {
  const language = emailLanguage(invitation.lang);
  const copy = invitationCopy[language];
  const fullName = oneLine(invitation.fullName);
  const articleTitle = oneLine(invitation.articleTitle);
  const residentFee = formatMoney(invitation.residentAmount, invitation.residentCurrency || 'KZT');
  const nonResidentFee = formatMoney(invitation.nonResidentAmount, invitation.nonResidentCurrency || 'USD');
  const hasCustomFee = Number.isFinite(Number(invitation.customAmount)) && Number(invitation.customAmount) > 0;
  const customFee = hasCustomFee ? formatMoney(invitation.customAmount, invitation.customCurrency || 'KZT') : '';
  const feeRows = hasCustomFee
    ? `<tr>
                  <td class="fee-label" style="padding:13px 0; color:#4f5d73; font-size:14px; line-height:21px;">${escapeHtml(copy.customLabel)}</td>
                  <td class="fee-value" align="right" style="padding:13px 0; color:#131a2b; font-size:15px; line-height:21px; font-weight:700; white-space:nowrap;">${escapeHtml(customFee)}</td>
                </tr>`
    : `<tr>
                  <td class="fee-label" style="padding:13px 0; color:#4f5d73; font-size:14px; line-height:21px;">${escapeHtml(copy.residentLabel)}</td>
                  <td class="fee-value" align="right" style="padding:13px 0; color:#131a2b; font-size:15px; line-height:21px; font-weight:700; white-space:nowrap;">${escapeHtml(residentFee)}</td>
                </tr>
                <tr>
                  <td class="fee-label" style="padding:13px 0; border-top:1px solid #e1e7ef; color:#4f5d73; font-size:14px; line-height:21px;">${escapeHtml(copy.nonResidentLabel)}</td>
                  <td class="fee-value" align="right" style="padding:13px 0; border-top:1px solid #e1e7ef; color:#131a2b; font-size:15px; line-height:21px; font-weight:700; white-space:nowrap;">${escapeHtml(nonResidentFee)}</td>
                </tr>`;
  const feeHint = hasCustomFee ? copy.customFeeHint : copy.feeHint;
  const supportEmail = oneLine(config.business.supportEmail);
  const supportPhone = oneLine(config.business.supportPhone);
  const businessName = oneLine(config.business.name);
  const site = websiteUrl();
  const phoneHref = supportPhone.replace(/[^\d+]/g, '');

  const html = `<!doctype html>
<html lang="${copy.documentLanguage}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(copy.subject)}</title>
  <style>
    @media only screen and (max-width: 640px) {
      .email-shell { width: 100% !important; }
      .email-card { border-radius: 0 !important; }
      .mobile-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .mobile-title { font-size: 28px !important; line-height: 34px !important; }
      .fee-label, .fee-value { display: block !important; width: 100% !important; text-align: left !important; }
      .fee-value { padding-top: 5px !important; }
      .step-cell { display: block !important; width: 100% !important; padding: 0 0 16px !important; }
      .button-link { display: block !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f3f6fa; color:#131a2b; font-family:Arial,Helvetica,sans-serif; -webkit-text-size-adjust:100%;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">${escapeHtml(copy.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f3f6fa; font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="email-shell email-card" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px; max-width:620px; background:#ffffff; border:1px solid #dfe6ee; border-radius:20px; overflow:hidden; box-shadow:0 12px 32px rgba(19,26,43,.08); font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td class="mobile-pad" style="padding:24px 40px; background:#131a2b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="48" valign="middle">
                    <div style="width:42px; height:42px; line-height:42px; border-radius:11px; background:#0b8b72; color:#ffffff; font-size:15px; font-weight:700; text-align:center;">CM</div>
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <div style="color:#ffffff; font-size:20px; line-height:25px; font-weight:700; letter-spacing:-.2px;">ClinMedKaz</div>
                    <div style="padding-top:2px; color:#aeb9ca; font-size:12px; line-height:18px;">${escapeHtml(copy.brandCaption)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:36px 40px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="28" valign="middle">
                    <div style="width:24px; height:24px; line-height:24px; border-radius:50%; background:#dff3ec; color:#087f68; font-size:15px; font-weight:700; text-align:center;">✓</div>
                  </td>
                  <td valign="middle" style="padding-left:8px; color:#087f68; font-size:13px; line-height:18px; font-weight:700; text-transform:uppercase; letter-spacing:.7px;">${escapeHtml(copy.status)}</td>
                </tr>
              </table>
              <p style="margin:24px 0 8px; color:#5f6c83; font-size:16px; line-height:25px;">${escapeHtml(copy.greeting(fullName))}</p>
              <h1 class="mobile-title" style="margin:0; color:#131a2b; font-size:34px; line-height:41px; font-weight:700; letter-spacing:-.8px;">${escapeHtml(copy.title)}</h1>
              <p style="margin:18px 0 0; color:#4f5d73; font-size:16px; line-height:26px;">${escapeHtml(copy.lead)}</p>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:20px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; background:#f7f9fc; border:1px solid #e1e7ef; border-radius:12px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <div style="margin-bottom:7px; color:#728097; font-size:12px; line-height:17px; font-weight:700; text-transform:uppercase; letter-spacing:.65px;">${escapeHtml(copy.articleLabel)}</div>
                    <div style="color:#131a2b; font-size:17px; line-height:25px; font-weight:700;">${escapeHtml(articleTitle)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:20px 40px 0;">
              <div style="margin-bottom:8px; color:#728097; font-size:12px; line-height:17px; font-weight:700; text-transform:uppercase; letter-spacing:.65px;">${escapeHtml(copy.feeLabel)}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%; border-top:1px solid #e1e7ef;">
                ${feeRows}
              </table>
              <p style="margin:7px 0 0; color:#728097; font-size:12px; line-height:18px;">${escapeHtml(feeHint)}</p>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:30px 40px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                <tr>
                  <td align="center" bgcolor="#087f68" style="border-radius:10px;">
                    <a class="button-link" href="${escapeHtml(link)}" target="_blank" style="display:inline-block; padding:15px 28px; border:1px solid #087f68; border-radius:10px; background:#087f68; color:#ffffff; font-size:16px; line-height:20px; font-weight:700; text-decoration:none;">${escapeHtml(copy.button)}&nbsp;&nbsp;→</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0; color:#5f6c83; font-size:13px; line-height:20px; text-align:center;">🔒&nbsp; ${escapeHtml(copy.securePayment)}</p>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:34px 40px 0;">
              <div style="margin-bottom:15px; color:#131a2b; font-size:15px; line-height:22px; font-weight:700;">${escapeHtml(copy.nextTitle)}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
                <tr>
                  ${copy.steps.map((step, index) => `<td class="step-cell" width="33.33%" valign="top" style="padding-right:${index === copy.steps.length - 1 ? '0' : '14px'}; color:#5f6c83; font-size:12px; line-height:18px;"><span style="display:inline-block; margin-bottom:7px; width:25px; height:25px; line-height:25px; border-radius:50%; background:#e9f5f1; color:#087f68; font-size:12px; font-weight:700; text-align:center;">${index + 1}</span><br>${escapeHtml(step)}</td>`).join('')}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:30px 40px 36px;">
              <div style="padding:16px 18px; background:#f7f9fc; border-radius:10px; color:#66748a; font-size:12px; line-height:18px; word-break:break-word;">
                ${escapeHtml(copy.linkHint)}<br>
                <a href="${escapeHtml(link)}" target="_blank" style="color:#087f68; text-decoration:underline;">${escapeHtml(link)}</a>
                <div style="margin-top:8px; color:#7a879a;">${escapeHtml(copy.personalLink)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:25px 40px; background:#e9f5f1; border-top:1px solid #d7e8e2;">
              <div style="color:#075f50; font-size:14px; line-height:21px; font-weight:700;">${escapeHtml(copy.help)}</div>
              <div style="margin-top:4px; color:#42665f; font-size:13px; line-height:21px;">${escapeHtml(copy.support)} <a href="mailto:${escapeHtml(supportEmail)}" style="color:#075f50; font-weight:700; text-decoration:none;">${escapeHtml(supportEmail)}</a>${supportPhone ? ` · <a href="tel:${escapeHtml(phoneHref)}" style="color:#075f50; font-weight:700; text-decoration:none;">${escapeHtml(supportPhone)}</a>` : ''}</div>
            </td>
          </tr>
          <tr>
            <td class="mobile-pad" style="padding:24px 40px 30px; background:#131a2b; color:#aeb9ca; font-size:11px; line-height:18px; text-align:center;">
              <div style="color:#ffffff; font-size:12px; font-weight:700;">${escapeHtml(businessName)}</div>
              <div style="margin-top:5px;">${escapeHtml(config.business.city)}, ${escapeHtml(config.business.country)} · <a href="${escapeHtml(site)}" target="_blank" style="color:#76d4c0; text-decoration:none;">${escapeHtml(copy.website)}</a></div>
              <div style="margin-top:10px; color:#8794a8;">${escapeHtml(copy.footerNote)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${copy.greeting(fullName)}

${copy.title}

${copy.lead}

${copy.articleLabel}: ${articleTitle}

${copy.feeLabel}:
${hasCustomFee ? `${copy.customLabel}: ${customFee}` : `${copy.residentLabel}: ${residentFee}\n${copy.nonResidentLabel}: ${nonResidentFee}`}
${feeHint}

${copy.button}: ${link}
${copy.securePayment}
${copy.personalLink}

${copy.help} ${copy.support} ${supportEmail}${supportPhone ? `, ${supportPhone}` : ''}

${businessName}
${site}`;

  return { subject: copy.subject, text, html };
}
