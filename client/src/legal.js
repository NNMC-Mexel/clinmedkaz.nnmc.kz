// Legal / compliance content for the payment site.
// Content is required by acquirer (Halyk ePay) and MPS (Visa/Mastercard) review:
// public offer, privacy policy, refund policy, service description and full requisites.
// All company/bank requisites are pulled from the public config so there is a single
// source of truth (see server/src/lib/config.ts -> publicConfig()).

function money(amount, currency) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: currency === "KZT" ? 0 : 2 }).format(Number(amount || 0))} ${currency}`;
}

function priceStrings(config) {
  const pricing = config.pricing || {};
  return {
    display: config.publicationFeeDisplay || `${pricing.nonResidentAmount || 300} USD`,
    kzt: money(pricing.residentKztAmount, "KZT"),
    usd: money(pricing.nonResidentAmount, "USD"),
    rate: pricing.usdToKztRate,
  };
}

function requisites(config, labels) {
  const b = config.business || {};
  const bank = config.bank || {};
  return [
    [labels.name, b.name],
    [labels.bin, b.bin],
    [labels.legalAddress, `${b.country}, ${b.city}, ${b.legalAddress}`],
    [labels.actualAddress, `${b.country}, ${b.city}, ${b.actualAddress || b.legalAddress}`],
    [labels.bank, bank.name],
    [labels.iban, bank.iban],
    [labels.bik, bank.bik],
    [labels.kbe, bank.kbe],
    [labels.chairman, b.chairmanName],
    [labels.workHours, b.workHours],
    [labels.phone, b.supportPhone],
    [labels.email, b.supportEmail],
  ].filter(([, value]) => value);
}

export function getLegalContent(lang, config) {
  const price = priceStrings(config);
  const b = config.business || {};
  const updated = "01.07.2026";

  const ru = () => {
    const reqLabels = {
      name: "Полное наименование", bin: "БИН", legalAddress: "Юридический адрес",
      actualAddress: "Фактический адрес", bank: "Банк", iban: "IBAN (счёт)", bik: "БИК",
      kbe: "Кбе", chairman: "Руководитель", workHours: "Время работы", phone: "Телефон", email: "Email",
    };
    return {
      service: {
        title: "Описание услуги",
        blocks: [
          { p: `${b.name} (далее — «Исполнитель») оказывает авторам научных статей платную услугу по редакционной подготовке и публикации статьи в научном журнале ClinMedKaz.` },
          { h: "Кто и за что платит" },
          { p: "Плательщиком является автор статьи (физическое лицо) либо организация, направляющая статью к публикации. Оплата вносится за услугу по рецензированию, редакционно-издательской подготовке и публикации одной научной статьи в журнале ClinMedKaz." },
          { h: "Стоимость" },
          { list: [
            `Стоимость публикации одной статьи — ${price.display}.`,
            `Для резидентов Республики Казахстан оплата производится в тенге: ${price.kzt} (по курсу ${price.rate} ₸ за 1 USD).`,
            `Для нерезидентов — ${price.usd}.`,
            "Все платежи проводятся в национальной валюте — тенге (KZT).",
          ] },
          { h: "Как оплатить" },
          { list: [
            "Автор получает персональную ссылку на оплату от редакции по электронной почте.",
            "На странице оплаты автор проверяет данные и сумму и нажимает «Перейти к оплате».",
            "Оплата производится банковской картой Visa или Mastercard через защищённый платёжный шлюз Halyk ePay (АО «Народный Банк Казахстана») с подтверждением по технологии 3D Secure.",
            "После успешной оплаты автор и редакция получают уведомление, статья принимается в работу.",
          ] },
          { h: "Сроки оказания услуги" },
          { p: "Услуга носит нематериальный характер (доставка физического товара не осуществляется). Редакционная подготовка начинается после поступления оплаты. Ориентировочный срок публикации определяется редакционной политикой журнала и сообщается автору отдельно." },
          { h: "Безопасность платежей" },
          { p: "Обработку платежей осуществляет платёжный сервис Halyk ePay. Данные банковской карты вводятся на защищённой странице банка, передаются в зашифрованном виде и не хранятся на нашем сайте. Соединение защищено протоколом TLS (https)." },
        ],
      },
      terms: {
        title: "Публичная оферта",
        blocks: [
          { p: `Настоящая публичная оферта (далее — «Оферта») является официальным предложением ${b.name} (далее — «Исполнитель») заключить договор возмездного оказания услуг по публикации научной статьи на изложенных ниже условиях.` },
          { h: "1. Предмет договора" },
          { p: "Исполнитель обязуется оказать услугу по редакционно-издательской подготовке и публикации научной статьи в журнале ClinMedKaz, а Заказчик (автор статьи или направляющая организация) обязуется оплатить эту услугу." },
          { h: "2. Акцепт оферты" },
          { p: "Акцептом (принятием) Оферты являются проставление отметки о согласии с условиями на странице оплаты и осуществление оплаты. С момента оплаты договор считается заключённым, а Заказчик — согласившимся со всеми условиями настоящей Оферты, Политики конфиденциальности и Правил возврата." },
          { h: "3. Стоимость и порядок оплаты" },
          { list: [
            `Стоимость услуги — ${price.display} (для резидентов РК — ${price.kzt}).`,
            "Оплата производится единовременно, безналичным способом, банковской картой через Halyk ePay.",
            "Валюта платежа — тенге (KZT).",
          ] },
          { h: "4. Права и обязанности сторон" },
          { list: [
            "Исполнитель обязуется оказать услугу надлежащего качества после поступления оплаты.",
            "Заказчик обязуется предоставить достоверные данные и материалы статьи, соответствующие требованиям журнала.",
            "Исполнитель вправе отказать в публикации при несоответствии статьи научным и этическим требованиям журнала с возвратом оплаты в соответствии с Правилами возврата.",
          ] },
          { h: "5. Ответственность и прочие условия" },
          { p: "Стороны несут ответственность в соответствии с законодательством Республики Казахстан. Во всём, что не урегулировано Офертой, стороны руководствуются законодательством РК." },
          { h: "Реквизиты Исполнителя" },
          { requisites: requisites(config, reqLabels) },
        ],
      },
      privacy: {
        title: "Политика конфиденциальности",
        blocks: [
          { p: `Настоящая Политика описывает, как ${b.name} обрабатывает и защищает персональные данные пользователей сайта в соответствии с Законом Республики Казахстан «О персональных данных и их защите».` },
          { h: "1. Какие данные мы собираем" },
          { list: [
            "Фамилия, имя, отчество автора;",
            "адрес электронной почты и номер телефона;",
            "название научной статьи;",
            "сведения о платеже (сумма, статус, идентификатор транзакции).",
          ] },
          { h: "2. Данные банковской карты" },
          { p: "Данные банковской карты (номер, срок действия, CVV) вводятся на защищённой странице платёжного сервиса Halyk ePay, обрабатываются исключительно банком и НЕ передаются на наш сайт и не хранятся у нас." },
          { h: "3. Цели обработки" },
          { list: [
            "проведение и подтверждение оплаты услуги;",
            "связь с автором по вопросам публикации;",
            "выполнение обязательств по договору и требований законодательства.",
          ] },
          { h: "4. Передача третьим лицам" },
          { p: "Персональные данные не передаются третьим лицам, за исключением платёжного провайдера (Halyk Bank) в объёме, необходимом для проведения оплаты, а также случаев, предусмотренных законодательством РК." },
          { h: "5. Хранение и защита" },
          { p: "Данные хранятся в течение срока, необходимого для целей обработки и предусмотренного законодательством, и защищаются организационными и техническими мерами. Передача данных по сети защищена протоколом TLS (https)." },
          { h: "6. Права пользователя" },
          { p: `Вы вправе запросить доступ, уточнение, блокирование или удаление своих персональных данных, направив обращение на ${b.supportEmail}.` },
        ],
      },
      refunds: {
        title: "Правила возврата",
        blocks: [
          { p: "Настоящие Правила определяют порядок возврата денежных средств за услугу публикации научной статьи." },
          { h: "1. Основания для возврата" },
          { list: [
            "Отказ автора от услуги до начала её оказания (до передачи статьи в редакционную подготовку) — возврат 100% оплаченной суммы.",
            "Отказ Исполнителя в публикации статьи по независящим от автора причинам — возврат 100%.",
            "Отказ автора после начала оказания услуги — возврат за вычетом фактически понесённых Исполнителем расходов.",
            "Услуга оказана в полном объёме (статья опубликована) — оплата возврату не подлежит.",
          ] },
          { h: "2. Как запросить возврат" },
          { p: `Для возврата направьте заявление на ${b.supportEmail}, указав ФИО, название статьи, дату и сумму платежа, а также причину возврата.` },
          { h: "3. Сроки и способ возврата" },
          { p: "Возврат производится на ту же банковскую карту, с которой была произведена оплата, в течение 3–10 рабочих дней с момента одобрения заявления. Срок зачисления зависит от банка-эмитента карты." },
          { h: "4. Валюта возврата" },
          { p: "Возврат осуществляется в валюте платежа (тенге). Комиссии платёжных систем при возврате не удерживаются Исполнителем." },
        ],
      },
      contacts: {
        title: "Контакты и реквизиты",
        blocks: [
          { p: `По всем вопросам оплаты и публикации обращайтесь: ${b.supportEmail}, ${b.supportPhone}. Время работы: ${b.workHours}.` },
          { requisites: requisites(config, {
            name: "Полное наименование", bin: "БИН", legalAddress: "Юридический адрес",
            actualAddress: "Фактический адрес", bank: "Банк", iban: "IBAN (счёт)", bik: "БИК",
            kbe: "Кбе", chairman: "Руководитель", workHours: "Время работы", phone: "Телефон", email: "Email",
          }) },
        ],
      },
    };
  };

  const en = () => {
    const reqLabels = {
      name: "Legal name", bin: "BIN", legalAddress: "Legal address", actualAddress: "Actual address",
      bank: "Bank", iban: "IBAN (account)", bik: "BIC", kbe: "Kbe", chairman: "Head of organization",
      workHours: "Working hours", phone: "Phone", email: "Email",
    };
    return {
      service: {
        title: "Service description",
        blocks: [
          { p: `${b.name} (the "Provider") offers authors of scientific articles a paid service of editorial preparation and publication of an article in the ClinMedKaz scientific journal.` },
          { h: "Who pays and for what" },
          { p: "The payer is the author of the article (an individual) or the organization submitting the article. Payment is made for reviewing, editorial preparation and publication of one scientific article in the ClinMedKaz journal." },
          { h: "Price" },
          { list: [
            `Publication of one article costs ${price.display}.`,
            `Residents of Kazakhstan pay in tenge: ${price.kzt} (at the rate of ${price.rate} ₸ per 1 USD).`,
            `Non-residents pay ${price.usd}.`,
            "All payments are processed in the national currency, tenge (KZT).",
          ] },
          { h: "How to pay" },
          { list: [
            "The author receives a personal payment link from the editorial office by email.",
            "On the payment page the author checks the details and amount and clicks \"Proceed to payment\".",
            "Payment is made by Visa or Mastercard via the secure Halyk ePay gateway (Halyk Bank of Kazakhstan) with 3D Secure confirmation.",
            "After a successful payment both the author and the editorial office are notified and the article is accepted for processing.",
          ] },
          { h: "Service delivery" },
          { p: "The service is intangible (no physical goods are shipped). Editorial preparation starts after payment is received. The estimated publication time follows the journal's editorial policy and is communicated to the author separately." },
          { h: "Payment security" },
          { p: "Payments are processed by Halyk ePay. Card data is entered on the bank's secure page, transmitted encrypted and is not stored on our site. The connection is protected by TLS (https)." },
        ],
      },
      terms: {
        title: "Public offer",
        blocks: [
          { p: `This public offer (the "Offer") is an official proposal by ${b.name} (the "Provider") to enter into a paid service agreement for the publication of a scientific article on the terms set out below.` },
          { h: "1. Subject" },
          { p: "The Provider undertakes to perform editorial preparation and publication of a scientific article in the ClinMedKaz journal, and the Customer (the author or the submitting organization) undertakes to pay for this service." },
          { h: "2. Acceptance" },
          { p: "The Offer is accepted by ticking the consent checkbox on the payment page and completing the payment. From the moment of payment the agreement is deemed concluded and the Customer is deemed to have accepted this Offer, the Privacy Policy and the Refund Policy." },
          { h: "3. Price and payment" },
          { list: [
            `The service costs ${price.display} (for residents of Kazakhstan — ${price.kzt}).`,
            "Payment is made as a single cashless card payment via Halyk ePay.",
            "The payment currency is tenge (KZT).",
          ] },
          { h: "4. Rights and obligations" },
          { list: [
            "The Provider undertakes to deliver a service of proper quality after payment is received.",
            "The Customer undertakes to provide accurate data and article materials that meet the journal's requirements.",
            "The Provider may decline publication if the article does not meet the journal's scientific and ethical requirements, with a refund in line with the Refund Policy.",
          ] },
          { h: "5. Liability" },
          { p: "The parties are liable under the laws of the Republic of Kazakhstan. Any matters not covered by this Offer are governed by the legislation of the Republic of Kazakhstan." },
          { h: "Provider requisites" },
          { requisites: requisites(config, reqLabels) },
        ],
      },
      privacy: {
        title: "Privacy policy",
        blocks: [
          { p: `This Policy describes how ${b.name} processes and protects users' personal data in accordance with the Law of the Republic of Kazakhstan "On Personal Data and its Protection".` },
          { h: "1. Data we collect" },
          { list: ["Author's full name;", "email address and phone number;", "article title;", "payment details (amount, status, transaction id)."] },
          { h: "2. Card data" },
          { p: "Bank card data (number, expiry, CVV) is entered on the secure page of the Halyk ePay service, processed solely by the bank and is NOT transmitted to or stored on our site." },
          { h: "3. Purposes" },
          { list: ["processing and confirming payment for the service;", "communicating with the author about publication;", "fulfilling the agreement and legal requirements."] },
          { h: "4. Sharing with third parties" },
          { p: "Personal data is not shared with third parties, except the payment provider (Halyk Bank) to the extent required to process the payment, and as required by the laws of Kazakhstan." },
          { h: "5. Storage and protection" },
          { p: "Data is kept for as long as necessary for the processing purposes and as required by law, and is protected by organizational and technical measures. Data transfer is protected by TLS (https)." },
          { h: "6. Your rights" },
          { p: `You may request access to, correction, blocking or deletion of your personal data by writing to ${b.supportEmail}.` },
        ],
      },
      refunds: {
        title: "Refund policy",
        blocks: [
          { p: "This policy sets out the procedure for refunding payments for the article publication service." },
          { h: "1. Grounds for a refund" },
          { list: [
            "The author cancels before the service starts (before the article enters editorial preparation) — 100% refund.",
            "The Provider declines publication for reasons beyond the author's control — 100% refund.",
            "The author cancels after the service has started — refund minus costs actually incurred by the Provider.",
            "The service has been fully delivered (article published) — no refund.",
          ] },
          { h: "2. How to request a refund" },
          { p: `To request a refund, send a request to ${b.supportEmail} stating your full name, the article title, the date and amount of the payment and the reason.` },
          { h: "3. Timing and method" },
          { p: "Refunds are made to the same bank card used for payment within 3–10 business days of the request being approved. Crediting time depends on the card issuer." },
          { h: "4. Refund currency" },
          { p: "Refunds are made in the payment currency (tenge). The Provider does not withhold payment-system fees on refunds." },
        ],
      },
      contacts: {
        title: "Contacts and requisites",
        blocks: [
          { p: `For any questions about payment and publication, contact us: ${b.supportEmail}, ${b.supportPhone}. Working hours: ${b.workHours}.` },
          { requisites: requisites(config, reqLabels) },
        ],
      },
    };
  };

  const kk = () => {
    const reqLabels = {
      name: "Толық атауы", bin: "БСН", legalAddress: "Заңды мекенжайы", actualAddress: "Нақты мекенжайы",
      bank: "Банк", iban: "IBAN (шот)", bik: "БСК", kbe: "Кбе", chairman: "Басшысы",
      workHours: "Жұмыс уақыты", phone: "Телефон", email: "Email",
    };
    return {
      service: {
        title: "Қызмет сипаттамасы",
        blocks: [
          { p: `${b.name} (бұдан әрі — «Орындаушы») ғылыми мақала авторларына ClinMedKaz ғылыми журналында мақаланы редакциялық дайындау және жариялау бойынша ақылы қызмет көрсетеді.` },
          { h: "Кім және не үшін төлейді" },
          { p: "Төлеуші — мақала авторы (жеке тұлға) немесе мақаланы жариялауға жіберетін ұйым. Төлем ClinMedKaz журналында бір ғылыми мақаланы рецензиялау, редакциялық-баспалық дайындау және жариялау қызметі үшін жасалады." },
          { h: "Құны" },
          { list: [
            `Бір мақаланы жариялау құны — ${price.display}.`,
            `Қазақстан Республикасының резиденттері теңгемен төлейді: ${price.kzt} (1 USD үшін ${price.rate} ₸ бағамы бойынша).`,
            `Резидент еместер үшін — ${price.usd}.`,
            "Барлық төлемдер ұлттық валютада — теңгемен (KZT) жүргізіледі.",
          ] },
          { h: "Қалай төлеуге болады" },
          { list: [
            "Автор редакциядан электрондық пошта арқылы төлемге жеке сілтеме алады.",
            "Төлем бетінде автор деректер мен соманы тексеріп, «Төлемге өту» батырмасын басады.",
            "Төлем Visa немесе Mastercard картасымен Halyk ePay қорғалған шлюзі арқылы (Қазақстан Халық Банкі) 3D Secure растауымен жүргізіледі.",
            "Табысты төлемнен кейін автор мен редакция хабарлама алады, мақала жұмысқа қабылданады.",
          ] },
          { h: "Қызмет көрсету мерзімі" },
          { p: "Қызмет материалдық емес (физикалық тауар жеткізілмейді). Редакциялық дайындау төлем түскеннен кейін басталады. Жариялаудың болжамды мерзімі журналдың редакциялық саясатымен айқындалады және авторға жеке хабарланады." },
          { h: "Төлем қауіпсіздігі" },
          { p: "Төлемдерді Halyk ePay қызметі өңдейді. Банк картасының деректері банктің қорғалған бетінде енгізіледі, шифрланған түрде беріледі және біздің сайтта сақталмайды. Байланыс TLS (https) хаттамасымен қорғалған." },
        ],
      },
      terms: {
        title: "Жария оферта",
        blocks: [
          { p: `Осы жария оферта (бұдан әрі — «Оферта») ${b.name} (бұдан әрі — «Орындаушы») тарапынан ғылыми мақаланы жариялау бойынша ақылы қызмет көрсету шартын төмендегі талаптарда жасасуға ресми ұсыныс болып табылады.` },
          { h: "1. Шарттың мәні" },
          { p: "Орындаушы ClinMedKaz журналында ғылыми мақаланы редакциялық-баспалық дайындау және жариялау қызметін көрсетуге, ал Тапсырыс беруші (мақала авторы немесе жіберуші ұйым) осы қызметке ақы төлеуге міндеттенеді." },
          { h: "2. Офертаны акцептеу" },
          { p: "Төлем бетінде талаптармен келісу белгісін қою және төлем жасау Офертаны акцептеу болып табылады. Төлем жасалған сәттен бастап шарт жасалған, ал Тапсырыс беруші осы Оферта, Құпиялылық саясаты және Қайтару ережелерінің барлық талаптарымен келіскен болып саналады." },
          { h: "3. Құны және төлеу тәртібі" },
          { list: [
            `Қызмет құны — ${price.display} (ҚР резиденттері үшін — ${price.kzt}).`,
            "Төлем бір жолғы, қолма-қол ақшасыз тәсілмен, банк картасымен Halyk ePay арқылы жүргізіледі.",
            "Төлем валютасы — теңге (KZT).",
          ] },
          { h: "4. Тараптардың құқықтары мен міндеттері" },
          { list: [
            "Орындаушы төлем түскеннен кейін тиісті сападағы қызметті көрсетуге міндеттенеді.",
            "Тапсырыс беруші журнал талаптарына сай нақты деректер мен мақала материалдарын беруге міндеттенеді.",
            "Орындаушы мақала журналдың ғылыми және этикалық талаптарына сай келмеген жағдайда Қайтару ережелеріне сәйкес ақшаны қайтара отырып, жариялаудан бас тартуға құқылы.",
          ] },
          { h: "5. Жауапкершілік" },
          { p: "Тараптар Қазақстан Республикасының заңнамасына сәйкес жауапты болады. Офертада реттелмеген барлық мәселелерде тараптар ҚР заңнамасын басшылыққа алады." },
          { h: "Орындаушының деректемелері" },
          { requisites: requisites(config, reqLabels) },
        ],
      },
      privacy: {
        title: "Құпиялылық саясаты",
        blocks: [
          { p: `Осы Саясат ${b.name} пайдаланушылардың дербес деректерін «Дербес деректер және оларды қорғау туралы» ҚР Заңына сәйкес қалай өңдейтінін және қорғайтынын сипаттайды.` },
          { h: "1. Біз жинайтын деректер" },
          { list: ["автордың тегі, аты, әкесінің аты;", "электрондық пошта мекенжайы және телефон нөмірі;", "ғылыми мақала атауы;", "төлем туралы мәліметтер (сома, мәртебе, транзакция идентификаторы)."] },
          { h: "2. Банк картасының деректері" },
          { p: "Банк картасының деректері (нөмірі, жарамдылық мерзімі, CVV) Halyk ePay қызметінің қорғалған бетінде енгізіледі, тек банкпен өңделеді және біздің сайтқа берілмейді әрі сақталмайды." },
          { h: "3. Өңдеу мақсаттары" },
          { list: ["қызметке төлемді жүргізу және растау;", "автормен жариялау мәселелері бойынша байланыс;", "шарт және заңнама талаптарын орындау."] },
          { h: "4. Үшінші тұлғаларға беру" },
          { p: "Дербес деректер төлемді жүргізу үшін қажетті көлемде төлем провайдеріне (Halyk Bank) және ҚР заңнамасында көзделген жағдайларды қоспағанда, үшінші тұлғаларға берілмейді." },
          { h: "5. Сақтау және қорғау" },
          { p: "Деректер өңдеу мақсаттары үшін қажетті және заңнамада көзделген мерзімде сақталады әрі ұйымдастырушылық және техникалық шаралармен қорғалады. Деректерді беру TLS (https) хаттамасымен қорғалған." },
          { h: "6. Пайдаланушының құқықтары" },
          { p: `Сіз ${b.supportEmail} мекенжайына жүгіну арқылы өз дербес деректеріңізге қол жеткізуді, нақтылауды, бұғаттауды немесе жоюды сұрай аласыз.` },
        ],
      },
      refunds: {
        title: "Қайтару ережелері",
        blocks: [
          { p: "Осы ережелер ғылыми мақаланы жариялау қызметі үшін ақшаны қайтару тәртібін айқындайды." },
          { h: "1. Қайтару негіздері" },
          { list: [
            "Автордың қызмет басталғанға дейін (мақала редакциялық дайындауға берілгенге дейін) бас тартуы — төленген соманың 100% қайтарылады.",
            "Орындаушының автордан тәуелсіз себептермен жариялаудан бас тартуы — 100% қайтарылады.",
            "Автордың қызмет басталғаннан кейін бас тартуы — Орындаушы нақты жұмсаған шығындарды шегеріп қайтарылады.",
            "Қызмет толық көрсетілген (мақала жарияланған) — ақша қайтарылмайды.",
          ] },
          { h: "2. Қайтаруды қалай сұрауға болады" },
          { p: `Қайтару үшін ${b.supportEmail} мекенжайына тегіңізді, мақала атауын, төлем күні мен сомасын және қайтару себебін көрсете отырып өтініш жіберіңіз.` },
          { h: "3. Мерзімі және тәсілі" },
          { p: "Қайтару төлем жасалған сол банк картасына өтініш мақұлданған сәттен бастап 3–10 жұмыс күні ішінде жүргізіледі. Есепке алу мерзімі картаны шығарған банкке байланысты." },
          { h: "4. Қайтару валютасы" },
          { p: "Қайтару төлем валютасында (теңге) жүргізіледі. Орындаушы қайтару кезінде төлем жүйелерінің комиссияларын ұстамайды." },
        ],
      },
      contacts: {
        title: "Байланыс және деректемелер",
        blocks: [
          { p: `Төлем және жариялау бойынша барлық сұрақтар бойынша хабарласыңыз: ${b.supportEmail}, ${b.supportPhone}. Жұмыс уақыты: ${b.workHours}.` },
          { requisites: requisites(config, reqLabels) },
        ],
      },
    };
  };

  const byLang = { ru, kk, en };
  const build = byLang[lang] || ru;
  return { content: build(), updated };
}
