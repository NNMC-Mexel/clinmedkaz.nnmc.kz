import { config } from "./config.js";

export const supportedLanguages = ["ru", "kk", "en"];

const languageNames = {
  ru: "RU",
  kk: "KZ",
  en: "EN"
};

const dictionary = {
  ru: {
    metaDescription: "Страница оплаты публикации статьи ClinMedKaz.",
    nav: {
      service: "Услуга",
      terms: "Оферта",
      privacy: "Конфиденциальность",
      refunds: "Возвраты",
      contacts: "Контакты"
    },
    footer: {
      support: "Поддержка"
    },
    paymentForm: {
      title: "Оплата публикации статьи",
      eyebrow: "Научная публикация ClinMedKaz",
      h1: "Оплата публикации статьи",
      lead: "Заполните данные автора и перейдите к безопасной оплате картой через Halyk ePay.",
      amount: "Сумма",
      charge: "Сумма платежа",
      authorDetails: "Данные автора",
      fullName: "ФИО",
      email: "Email",
      phone: "Номер телефона",
      articleTitle: "Название статьи",
      residencyTitle: "Резидентство",
      residentKz: "Резидент Казахстана",
      nonResident: "Нерезидент",
      agreement: "Я согласен с публичной офертой, политикой конфиденциальности и правилами возврата.",
      submit: "Перейти к оплате",
      residentCharge: "К оплате для резидента РК",
      nonResidentCharge: "К оплате для нерезидента",
      exchangeRate: "Курс",
      processTitle: "Порядок оплаты",
      steps: [
        "Автор заполняет данные для оплаты публикации.",
        "Система открывает защищенную платежную страницу Halyk ePay.",
        "После успешной оплаты администратор получает уведомление.",
        "Администратор публикует статью после подтверждения оплаты."
      ],
      security: "Карточные данные обрабатываются Halyk ePay с 3D Secure. ClinMedKaz не хранит данные карт."
    },
    pay: {
      title: "Переход в Halyk ePay",
      eyebrow: "Безопасная оплата картой",
      h1: "Открываем Halyk ePay",
      order: "Заказ",
      for: "для",
      button: "Открыть форму оплаты"
    },
    result: {
      receivedTitle: "Оплата получена",
      failedTitle: "Оплата не прошла",
      confirmed: "Оплата подтверждена",
      notCompleted: "Оплата не завершена",
      thankYou: "Спасибо",
      tryAgain: "Попробуйте еще раз",
      successText: "Администратор получил уведомление и опубликует статью после финальной проверки.",
      failedText: "Оплата не была завершена. Вернитесь по платежной ссылке и попробуйте еще раз.",
      order: "Заказ",
      article: "Статья",
      back: "Вернуться к форме оплаты"
    },
    admin: {
      title: "Админ",
      h1: "Администрирование оплат",
      token: "Admin token",
      save: "Сохранить token",
      createTitle: "Создать ссылку на оплату",
      authorEmail: "Email автора",
      fullName: "ФИО",
      phone: "Телефон",
      articleTitle: "Название статьи",
      language: "Язык ссылки",
      sendEmail: "Отправить ссылку на email",
      create: "Создать ссылку",
      orders: "Заказы",
      refresh: "Обновить"
    },
    adminJs: {
      creating: "Создаем ссылку...",
      created: "Ссылка создана",
      createError: "Не удалось создать приглашение.",
      loading: "Загрузка...",
      loadError: "Не удалось загрузить данные админки.",
      empty: "Заказов пока нет.",
      headers: ["Статус", "Инвойс", "Автор", "Статья", "Сумма", "Reference", "Обновлено"]
    },
    appJs: {
      preparing: "Подготавливаем оплату...",
      createError: "Не удалось создать оплату."
    },
    payJs: {
      token: "Запрашиваем защищенный платежный токен...",
      open: "Открываем Halyk ePay...",
      startError: "Не удалось начать оплату.",
      scriptError: "Скрипт Halyk ePay не загрузился."
    },
    legal: {
      service: {
        title: "Описание услуги",
        body: (b) => `
          <h1>Описание услуги</h1>
          <p>${escapeHtml(b.name)} принимает оплату за публикацию принятых научных и медицинских статей на платформе ClinMedKaz.</p>
          <p>Услуга включает административную обработку принятой статьи и онлайн-публикацию после подтверждения оплаты.</p>
          <h2>Стоимость</h2>
          <p>Плата за публикацию: ${escapeHtml(config.publicationFeeDisplay)}. Резиденты Казахстана оплачивают эквивалент в тенге: ${escapeHtml(formatMoney(config.pricing.residentKztAmount, "KZT"))} по курсу ${escapeHtml(config.pricing.usdToKztRate)} KZT за 1 USD. Нерезиденты оплачивают ${escapeHtml(formatMoney(config.pricing.nonResidentAmount, "USD"))}, если валютный терминал Halyk подключен.</p>
          <h2>Порядок оформления</h2>
          <ol class="steps">
            <li>Автор отправляет статью в редакционный процесс.</li>
            <li>Администратор рассматривает статью и принимает или отклоняет ее.</li>
            <li>Для принятых статей администратор отправляет автору ссылку на оплату.</li>
            <li>Автор заполняет данные и оплачивает картой через Halyk ePay.</li>
            <li>Администратор получает подтверждение оплаты и публикует статью.</li>
          </ol>`
      },
      terms: {
        title: "Публичная оферта",
        body: () => `
          <h1>Публичная оферта</h1>
          <p>Настоящая публичная оферта регулирует онлайн-оплату публикации статьи авторами, чьи статьи были приняты администратором.</p>
          <p>Плательщик подтверждает корректность названия статьи и персональных данных, введенных до оплаты. Оплата принимается только за услуги публикации статьи, описанные на этом сайте.</p>
          <p>Оказание услуги начинается после успешного подтверждения оплаты от Halyk ePay. Администратор публикует статью после сопоставления оплаты с принятой статьей.</p>`
      },
      privacy: {
        title: "Политика конфиденциальности",
        body: (b) => `
          <h1>Политика конфиденциальности и защита персональных данных</h1>
          <p>Мы собираем ФИО автора, email, номер телефона и название статьи для идентификации платежа и уведомления администратора.</p>
          <p>Данные карты вводятся только на платежной странице Halyk ePay. ${escapeHtml(b.name)} не хранит полные номера карт, CVV/CVC или данные 3D Secure.</p>
          <p>Персональные данные используются для обработки платежа, администрирования публикации, бухгалтерского учета и урегулирования спорных ситуаций.</p>`
      },
      refunds: {
        title: "Правила возврата",
        body: () => `
          <h1>Правила возврата и отмены</h1>
          <p>До оплаты автор может отменить заказ, не завершая карточный платеж.</p>
          <p>Запросы на возврат рассматриваются администратором. Если услуга публикации статьи не была оказана, возврат может быть инициирован через банк-эквайер согласно правилам платежных систем.</p>
          <p>Для споров или chargeback-запросов обратитесь в поддержку и укажите дату платежа, номер инвойса, имя плательщика и название статьи.</p>`
      },
      contacts: {
        title: "Контакты",
        labels: {
          enterprise: "Предприятие",
          countryCity: "Страна и город",
          legalAddress: "Юридический адрес",
          actualAddress: "Фактический адрес",
          bin: "БИН/ИИН",
          workHours: "График работы",
          supportPhone: "Телефон поддержки",
          supportEmail: "Email поддержки"
        }
      }
    }
  },
  kk: {
    metaDescription: "ClinMedKaz мақаласын жариялау ақысын төлеу беті.",
    nav: {
      service: "Қызмет",
      terms: "Оферта",
      privacy: "Құпиялылық",
      refunds: "Қайтару",
      contacts: "Байланыс"
    },
    footer: {
      support: "Қолдау"
    },
    paymentForm: {
      title: "Мақаланы жариялау ақысын төлеу",
      eyebrow: "ClinMedKaz ғылыми жарияланымы",
      h1: "Мақаланы жариялау ақысы",
      lead: "Автор деректерін толтырып, Halyk ePay арқылы қауіпсіз карта төлеміне өтіңіз.",
      amount: "Сома",
      charge: "Төлем сомасы",
      authorDetails: "Автор деректері",
      fullName: "Т.А.Ә.",
      email: "Email",
      phone: "Телефон нөмірі",
      articleTitle: "Мақала атауы",
      residencyTitle: "Резиденттік",
      residentKz: "Қазақстан резиденті",
      nonResident: "Резидент емес",
      agreement: "Мен жария офертамен, құпиялылық саясатымен және қайтару ережелерімен келісемін.",
      submit: "Төлемге өту",
      residentCharge: "ҚР резиденті үшін төлем",
      nonResidentCharge: "Резидент емес үшін төлем",
      exchangeRate: "Курс",
      processTitle: "Төлем тәртібі",
      steps: [
        "Автор жариялау ақысына арналған деректерді толтырады.",
        "Жүйе Halyk ePay қорғалған төлем бетін ашады.",
        "Сәтті төлемнен кейін әкімші хабарлама алады.",
        "Әкімші төлем расталғаннан кейін мақаланы жариялайды."
      ],
      security: "Карта деректерін Halyk ePay 3D Secure арқылы өңдейді. ClinMedKaz карта деректерін сақтамайды."
    },
    pay: {
      title: "Halyk ePay жүйесіне өту",
      eyebrow: "Қауіпсіз карта төлемі",
      h1: "Halyk ePay ашылуда",
      order: "Тапсырыс",
      for: "авторы",
      button: "Төлем формасын ашу"
    },
    result: {
      receivedTitle: "Төлем қабылданды",
      failedTitle: "Төлем өтпеді",
      confirmed: "Төлем расталды",
      notCompleted: "Төлем аяқталмады",
      thankYou: "Рахмет",
      tryAgain: "Қайта көріңіз",
      successText: "Әкімші хабарлама алды және соңғы тексерістен кейін мақаланы жариялайды.",
      failedText: "Төлем аяқталған жоқ. Төлем сілтемесіне қайта оралып, тағы көріңіз.",
      order: "Тапсырыс",
      article: "Мақала",
      back: "Төлем формасына оралу"
    },
    admin: {
      title: "Әкімші",
      h1: "Төлемдерді басқару",
      token: "Admin token",
      save: "Token сақтау",
      createTitle: "Төлем сілтемесін жасау",
      authorEmail: "Автор email",
      fullName: "Т.А.Ә.",
      phone: "Телефон",
      articleTitle: "Мақала атауы",
      language: "Сілтеме тілі",
      sendEmail: "Сілтемені email арқылы жіберу",
      create: "Сілтеме жасау",
      orders: "Тапсырыстар",
      refresh: "Жаңарту"
    },
    adminJs: {
      creating: "Сілтеме жасалуда...",
      created: "Сілтеме жасалды",
      createError: "Шақыру жасау мүмкін болмады.",
      loading: "Жүктелуде...",
      loadError: "Әкімші деректерін жүктеу мүмкін болмады.",
      empty: "Әзірге тапсырыс жоқ.",
      headers: ["Статус", "Инвойс", "Автор", "Мақала", "Сома", "Reference", "Жаңартылды"]
    },
    appJs: {
      preparing: "Төлем дайындалуда...",
      createError: "Төлем жасау мүмкін болмады."
    },
    payJs: {
      token: "Қорғалған төлем токені сұралуда...",
      open: "Halyk ePay ашылуда...",
      startError: "Төлемді бастау мүмкін болмады.",
      scriptError: "Halyk ePay скрипті жүктелмеді."
    },
    legal: {
      service: {
        title: "Қызмет сипаттамасы",
        body: (b) => `
          <h1>Қызмет сипаттамасы</h1>
          <p>${escapeHtml(b.name)} ClinMedKaz платформасында қабылданған ғылыми және медициналық мақалаларды жариялау үшін төлем қабылдайды.</p>
          <p>Қызмет қабылданған мақаланы әкімшілік өңдеуді және төлем расталғаннан кейін онлайн жариялауды қамтиды.</p>
          <h2>Бағасы</h2>
          <p>Жариялау ақысы: ${escapeHtml(config.publicationFeeDisplay)}. Қазақстан резиденттері теңгедегі баламасын төлейді: ${escapeHtml(formatMoney(config.pricing.residentKztAmount, "KZT"))}, курс ${escapeHtml(config.pricing.usdToKztRate)} KZT үшін 1 USD. Резидент еместер Halyk валюталық терминалы қосылған болса, ${escapeHtml(formatMoney(config.pricing.nonResidentAmount, "USD"))} төлейді.</p>
          <h2>Тапсырыс рәсімі</h2>
          <ol class="steps">
            <li>Автор мақаланы редакциялық процеске жібереді.</li>
            <li>Әкімші мақаланы қарап, қабылдайды немесе қабылдамайды.</li>
            <li>Қабылданған мақалалар үшін әкімші авторға төлем сілтемесін жібереді.</li>
            <li>Автор деректерін толтырып, Halyk ePay арқылы картамен төлейді.</li>
            <li>Әкімші төлем растауын алып, мақаланы жариялайды.</li>
          </ol>`
      },
      terms: {
        title: "Жария оферта",
        body: () => `
          <h1>Жария оферта</h1>
          <p>Осы жария оферта әкімші қабылдаған мақалаларды жариялау үшін онлайн төлемді реттейді.</p>
          <p>Төлеуші төлемге дейін енгізілген мақала атауы мен жеке деректердің дұрыстығын растайды. Төлем тек осы сайтта сипатталған мақала жариялау қызметі үшін қабылданады.</p>
          <p>Қызмет Halyk ePay төлемді сәтті растағаннан кейін басталады. Әкімші төлемді қабылданған мақаламен сәйкестендіргеннен кейін мақаланы жариялайды.</p>`
      },
      privacy: {
        title: "Құпиялылық саясаты",
        body: (b) => `
          <h1>Құпиялылық саясаты және дербес деректерді қорғау</h1>
          <p>Біз төлемді сәйкестендіру және әкімшіге хабарлау үшін автордың Т.А.Ә., email, телефон нөмірі және мақала атауын жинаймыз.</p>
          <p>Карта деректері тек Halyk ePay төлем бетінде енгізіледі. ${escapeHtml(b.name)} толық карта нөмірлерін, CVV/CVC немесе 3D Secure деректерін сақтамайды.</p>
          <p>Дербес деректер төлемді өңдеу, жариялауды әкімшілендіру, бухгалтерлік есеп және даулы жағдайларды шешу үшін қолданылады.</p>`
      },
      refunds: {
        title: "Қайтару ережелері",
        body: () => `
          <h1>Қайтару және бас тарту ережелері</h1>
          <p>Төлемге дейін автор карта төлемін аяқтамай, тапсырыстан бас тарта алады.</p>
          <p>Қайтару сұрауларын әкімші қарайды. Егер мақала жариялау қызметі көрсетілмесе, қайтару төлем жүйелері ережелеріне сәйкес эквайер банк арқылы басталуы мүмкін.</p>
          <p>Дау немесе chargeback сұрауы үшін қолдау қызметіне хабарласып, төлем күнін, инвойс нөмірін, төлеуші атын және мақала атауын көрсетіңіз.</p>`
      },
      contacts: {
        title: "Байланыс",
        labels: {
          enterprise: "Кәсіпорын",
          countryCity: "Ел және қала",
          legalAddress: "Заңды мекенжай",
          actualAddress: "Нақты мекенжай",
          bin: "БСН/ЖСН",
          workHours: "Жұмыс уақыты",
          supportPhone: "Қолдау телефоны",
          supportEmail: "Қолдау email"
        }
      }
    }
  },
  en: {
    metaDescription: "Payment page for ClinMedKaz article publication fee.",
    nav: {
      service: "Service",
      terms: "Offer",
      privacy: "Privacy",
      refunds: "Refunds",
      contacts: "Contacts"
    },
    footer: {
      support: "Support"
    },
    paymentForm: {
      title: "Article publication payment",
      eyebrow: "ClinMedKaz scientific publication",
      h1: "Article publication fee",
      lead: "Complete author details and proceed to secure Halyk ePay card payment.",
      amount: "Amount",
      charge: "Payment charge",
      authorDetails: "Author details",
      fullName: "Full name",
      email: "Email",
      phone: "Phone number",
      articleTitle: "Article title",
      residencyTitle: "Residency",
      residentKz: "Kazakhstan resident",
      nonResident: "Non-resident",
      agreement: "I agree with the public offer, privacy policy and refund rules.",
      submit: "Proceed to payment",
      residentCharge: "Payment for Kazakhstan resident",
      nonResidentCharge: "Payment for non-resident",
      exchangeRate: "Exchange rate",
      processTitle: "Payment process",
      steps: [
        "Author fills in article payment details.",
        "The system opens Halyk ePay secure payment page.",
        "After successful payment, the administrator receives notification.",
        "The article is published by the administrator after payment confirmation."
      ],
      security: "Cards are processed by Halyk ePay with 3D Secure. ClinMedKaz does not store card data."
    },
    pay: {
      title: "Redirecting to Halyk ePay",
      eyebrow: "Secure card payment",
      h1: "Opening Halyk ePay",
      order: "Order",
      for: "for",
      button: "Open payment form"
    },
    result: {
      receivedTitle: "Payment received",
      failedTitle: "Payment failed",
      confirmed: "Payment confirmed",
      notCompleted: "Payment not completed",
      thankYou: "Thank you",
      tryAgain: "Please try again",
      successText: "The administrator has been notified and will publish the article after final verification.",
      failedText: "The payment was not completed. You can return to the payment link and try again.",
      order: "Order",
      article: "Article",
      back: "Back to payment form"
    },
    admin: {
      title: "Admin",
      h1: "Admin payments",
      token: "Admin token",
      save: "Save token",
      createTitle: "Create payment link",
      authorEmail: "Author email",
      fullName: "Full name",
      phone: "Phone",
      articleTitle: "Article title",
      language: "Link language",
      sendEmail: "Send link by email",
      create: "Create link",
      orders: "Orders",
      refresh: "Refresh"
    },
    adminJs: {
      creating: "Creating link...",
      created: "Link created",
      createError: "Could not create invitation.",
      loading: "Loading...",
      loadError: "Could not load admin data.",
      empty: "No orders yet.",
      headers: ["Status", "Invoice", "Author", "Article", "Amount", "Reference", "Updated"]
    },
    appJs: {
      preparing: "Preparing payment...",
      createError: "Payment could not be created."
    },
    payJs: {
      token: "Requesting secure payment token...",
      open: "Opening Halyk ePay...",
      startError: "Could not start payment.",
      scriptError: "Halyk ePay script is not loaded."
    },
    legal: {
      service: {
        title: "Service description",
        body: (b) => `
          <h1>Service description</h1>
          <p>${escapeHtml(b.name)} accepts payment for publishing accepted scientific and medical articles on the ClinMedKaz publication platform.</p>
          <p>The service includes administrative processing of the accepted article and online publication after payment confirmation.</p>
          <h2>Price</h2>
          <p>Publication fee: ${escapeHtml(config.publicationFeeDisplay)}. Kazakhstan residents pay the KZT equivalent: ${escapeHtml(formatMoney(config.pricing.residentKztAmount, "KZT"))} at ${escapeHtml(config.pricing.usdToKztRate)} KZT per 1 USD. Non-residents pay ${escapeHtml(formatMoney(config.pricing.nonResidentAmount, "USD"))} if the Halyk foreign-currency terminal is enabled.</p>
          <h2>Order process</h2>
          <ol class="steps">
            <li>The author submits an article to the editorial workflow.</li>
            <li>The administrator reviews and accepts or rejects the article.</li>
            <li>For accepted articles, the administrator sends a payment link to the author.</li>
            <li>The author fills in author details and pays by card through Halyk ePay.</li>
            <li>The administrator receives payment confirmation and publishes the article.</li>
          </ol>`
      },
      terms: {
        title: "Public offer",
        body: () => `
          <h1>Public offer</h1>
          <p>This public offer regulates online payment for article publication by authors whose articles were accepted by the administrator.</p>
          <p>The payer confirms that the article title and personal details entered before payment are correct. Payment is accepted only for article publication services described on this website.</p>
          <p>Service delivery starts after successful payment confirmation from Halyk ePay. The administrator publishes the article after matching the payment with the accepted article.</p>`
      },
      privacy: {
        title: "Privacy policy",
        body: (b) => `
          <h1>Privacy policy and personal data protection</h1>
          <p>We collect the author's full name, email, phone number and article title to identify the payment and notify the administrator.</p>
          <p>Card data is entered only on the Halyk ePay payment page. ${escapeHtml(b.name)} does not store full card numbers, CVV/CVC or 3D Secure credentials.</p>
          <p>Personal data is used for payment processing, publication administration, accounting and dispute handling.</p>`
      },
      refunds: {
        title: "Refund and cancellation policy",
        body: () => `
          <h1>Refund and cancellation policy</h1>
          <p>Before payment, the author may cancel the order by not completing the card payment.</p>
          <p>Refund requests are reviewed by the administrator. If the article publication service has not been delivered, a refund may be initiated through the acquiring bank according to card network rules.</p>
          <p>For disputes or chargeback requests, contact support and provide payment date, invoice number, payer name and article title.</p>`
      },
      contacts: {
        title: "Contacts",
        labels: {
          enterprise: "Enterprise",
          countryCity: "Country and city",
          legalAddress: "Legal address",
          actualAddress: "Actual address",
          bin: "BIN/IIN",
          workHours: "Working hours",
          supportPhone: "Support phone",
          supportEmail: "Support email"
        }
      }
    }
  }
};

export function normalizeLanguage(lang) {
  return supportedLanguages.includes(lang) ? lang : "ru";
}

export function getTranslations(lang) {
  return dictionary[normalizeLanguage(lang)];
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(amount, currency) {
  const rounded = currency === "KZT" ? Math.round(Number(amount)) : Number(amount);
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: currency === "KZT" ? 0 : 2
  }).format(rounded)} ${currency}`;
}

function langHref(path, query, lang) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (key === "lang" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  params.set("lang", lang);
  return `${path}?${params.toString()}`;
}

function nav(lang, path, query) {
  const t = getTranslations(lang);
  const links = [
    ["/service", t.nav.service],
    ["/terms", t.nav.terms],
    ["/privacy", t.nav.privacy],
    ["/refunds", t.nav.refunds],
    ["/contacts", t.nav.contacts]
  ];
  return `
    <nav class="top-nav" aria-label="Primary">
      <a class="brand" href="${langHref("/", {}, lang)}"><span class="brand-mark">CM</span><span>ClinMedKaz Pay</span></a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-menu" aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav-links" id="primary-menu">
        ${links.map(([href, label]) => `<a href="${langHref(href, {}, lang)}">${escapeHtml(label)}</a>`).join("")}
      </div>
      <div class="lang-switch" aria-label="Language">
        ${supportedLanguages
          .map((item) => {
            const active = item === lang ? " active" : "";
            return `<a class="${active}" href="${langHref(path, query, item)}">${languageNames[item]}</a>`;
          })
          .join("")}
      </div>
    </nav>
  `;
}

function footer(lang) {
  const t = getTranslations(lang);
  return `
    <footer class="site-footer">
      <div>
        <strong>${escapeHtml(config.business.name)}</strong><br>
        ${escapeHtml(config.business.country)}, ${escapeHtml(config.business.city)}<br>
        ${escapeHtml(t.footer.support)}: <a href="mailto:${escapeHtml(config.business.supportEmail)}">${escapeHtml(config.business.supportEmail)}</a>,
        ${escapeHtml(config.business.supportPhone)}
      </div>
      <div class="payment-mark">
        <a href="https://epayment.kz" rel="noopener" target="_blank">ePay by Halyk</a>
        <span>Visa</span>
        <span>Mastercard</span>
        <span>3D Secure</span>
      </div>
    </footer>
  `;
}

export function layout({ title, body, lang = "ru", path = "/", query = {}, scripts = "" }) {
  const t = getTranslations(lang);
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | ClinMedKaz Pay</title>
    <meta name="description" content="${escapeHtml(t.metaDescription)}">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    ${nav(lang, path, query)}
    <main>${body}</main>
    ${footer(lang)}
    <script src="/nav.js"></script>
    ${scripts}
  </body>
</html>`;
}

export function paymentFormPage(invitation, options = {}) {
  const lang = normalizeLanguage(options.lang);
  const t = getTranslations(lang).paymentForm;
  const residentCharge = formatMoney(config.pricing.residentKztAmount, "KZT");
  const nonResidentCharge = formatMoney(config.pricing.nonResidentAmount, "USD");
  const pricingJson = JSON.stringify({
    resident: residentCharge,
    nonResident: nonResidentCharge,
    residentLabel: t.residentCharge,
    nonResidentLabel: t.nonResidentCharge,
    exchangeRateLabel: t.exchangeRate,
    exchangeRate: config.pricing.usdToKztRate
  });
  const inviteJson = JSON.stringify({
    id: invitation?.id || "",
    fullName: invitation?.fullName || "",
    email: invitation?.email || "",
    phone: invitation?.phone || "",
    articleTitle: invitation?.articleTitle || ""
  });

  return layout({
    title: t.title,
    lang,
    path: options.path || "/",
    query: options.query || {},
    body: `
      <section class="hero">
        <div>
          <p class="eyebrow">${escapeHtml(t.eyebrow)}</p>
          <h1>${escapeHtml(t.h1)}</h1>
          <p class="lead">${escapeHtml(t.lead)}</p>
        </div>
        <div class="price-panel" aria-label="${escapeHtml(t.amount)}">
          <span class="price-label">${escapeHtml(t.amount)}</span>
          <strong>${escapeHtml(config.publicationFeeDisplay)}</strong>
          <small id="payment-charge">${escapeHtml(t.residentCharge)}: ${escapeHtml(residentCharge)}</small>
          <small>${escapeHtml(t.exchangeRate)}: 1 USD = ${escapeHtml(config.pricing.usdToKztRate)} KZT</small>
        </div>
      </section>
      <section class="content-grid">
        <form id="payment-form" class="panel form-panel">
          <h2>${escapeHtml(t.authorDetails)}</h2>
          <input type="hidden" name="invitationId" id="invitationId">
          <input type="hidden" name="lang" id="lang" value="${escapeHtml(lang)}">
          <label>${escapeHtml(t.fullName)}
            <input name="fullName" id="fullName" autocomplete="name" required minlength="3">
          </label>
          <label>${escapeHtml(t.email)}
            <input name="email" id="email" type="email" autocomplete="email" required>
          </label>
          <label>${escapeHtml(t.phone)}
            <input name="phone" id="phone" autocomplete="tel" required minlength="6">
          </label>
          <label>${escapeHtml(t.articleTitle)}
            <textarea name="articleTitle" id="articleTitle" required minlength="3"></textarea>
          </label>
          <fieldset class="field-group">
            <legend>${escapeHtml(t.residencyTitle)}</legend>
            <label class="radio-line">
              <input type="radio" name="residency" value="resident_kz" checked>
              <span>${escapeHtml(t.residentKz)} - ${escapeHtml(residentCharge)}</span>
            </label>
            <label class="radio-line">
              <input type="radio" name="residency" value="non_resident">
              <span>${escapeHtml(t.nonResident)} - ${escapeHtml(nonResidentCharge)}</span>
            </label>
          </fieldset>
          <label class="checkline">
            <input type="checkbox" required>
            <span>${escapeHtml(t.agreement)}</span>
          </label>
          <button class="primary-btn form-submit" type="submit">${escapeHtml(t.submit)}</button>
          <p id="form-status" class="status-text" role="status"></p>
        </form>
        <aside class="panel quiet process-panel">
          <h2>${escapeHtml(t.processTitle)}</h2>
          <ol class="steps">
            ${t.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
          </ol>
          <p class="muted">${escapeHtml(t.security)}</p>
        </aside>
      </section>
    `,
    scripts: `<script>window.__INVITATION__ = ${inviteJson}; window.__LANG__ = ${JSON.stringify(lang)}; window.__APP_I18N__ = ${JSON.stringify(getTranslations(lang).appJs)}; window.__PRICING__ = ${pricingJson};</script><script src="/app.js"></script>`
  });
}

export function payPage(order, options = {}) {
  const lang = normalizeLanguage(options.lang || order.lang);
  const t = getTranslations(lang).pay;
  return layout({
    title: t.title,
    lang,
    path: options.path || `/pay/${order.id}`,
    query: options.query || {},
    body: `
      <section class="center-panel">
        <div class="panel">
          <p class="eyebrow">${escapeHtml(t.eyebrow)}</p>
          <h1>${escapeHtml(t.h1)}</h1>
          <p>${escapeHtml(t.order)} ${escapeHtml(order.invoiceId)} ${escapeHtml(t.for)} ${escapeHtml(order.fullName)}.</p>
          <button id="open-payment" class="primary-btn">${escapeHtml(t.button)}</button>
          <p id="payment-status" class="status-text" role="status"></p>
        </div>
      </section>
    `,
    scripts: `<script src="${escapeHtml(config.halyk.paymentJsUrl)}"></script><script>window.__ORDER_ID__=${JSON.stringify(order.id)}; window.__PAY_I18N__=${JSON.stringify(getTranslations(lang).payJs)};</script><script src="/pay.js"></script>`
  });
}

export function resultPage({ ok, order, lang = "ru", path = "/", query = {} }) {
  const currentLang = normalizeLanguage(lang || order?.lang);
  const t = getTranslations(currentLang).result;
  return layout({
    title: ok ? t.receivedTitle : t.failedTitle,
    lang: currentLang,
    path,
    query,
    body: `
      <section class="center-panel">
        <div class="panel ${ok ? "success" : "danger"}">
          <p class="eyebrow">${ok ? escapeHtml(t.confirmed) : escapeHtml(t.notCompleted)}</p>
          <h1>${ok ? escapeHtml(t.thankYou) : escapeHtml(t.tryAgain)}</h1>
          <p>${ok ? escapeHtml(t.successText) : escapeHtml(t.failedText)}</p>
          ${order ? `<p class="muted">${escapeHtml(t.order)}: ${escapeHtml(order.invoiceId)}<br>${escapeHtml(t.article)}: ${escapeHtml(order.articleTitle)}</p>` : ""}
          <a class="secondary-btn" href="${langHref("/", {}, currentLang)}">${escapeHtml(t.back)}</a>
        </div>
      </section>
    `
  });
}

export function adminPage(options = {}) {
  const lang = normalizeLanguage(options.lang);
  const t = getTranslations(lang).admin;
  return layout({
    title: t.title,
    lang,
    path: options.path || "/admin",
    query: options.query || {},
    body: `
      <section class="admin-shell">
        <div class="panel">
          <h1>${escapeHtml(t.h1)}</h1>
          <label>${escapeHtml(t.token)}
            <input id="admin-token" type="password" autocomplete="off" placeholder="ADMIN_TOKEN">
          </label>
          <button id="save-token" class="secondary-btn" type="button">${escapeHtml(t.save)}</button>
        </div>
        <form id="invite-form" class="panel">
          <h2>${escapeHtml(t.createTitle)}</h2>
          <label>${escapeHtml(t.authorEmail)}
            <input name="email" type="email" required>
          </label>
          <label>${escapeHtml(t.fullName)}
            <input name="fullName" required>
          </label>
          <label>${escapeHtml(t.phone)}
            <input name="phone">
          </label>
          <label>${escapeHtml(t.articleTitle)}
            <textarea name="articleTitle" required></textarea>
          </label>
          <label>${escapeHtml(t.language)}
            <select name="lang">
              <option value="ru"${lang === "ru" ? " selected" : ""}>Русский</option>
              <option value="kk"${lang === "kk" ? " selected" : ""}>Қазақша</option>
              <option value="en"${lang === "en" ? " selected" : ""}>English</option>
            </select>
          </label>
          <label class="checkline">
            <input name="sendEmail" type="checkbox" checked>
            <span>${escapeHtml(t.sendEmail)}</span>
          </label>
          <button class="primary-btn" type="submit">${escapeHtml(t.create)}</button>
          <p id="invite-status" class="status-text"></p>
        </form>
        <div class="panel wide">
          <div class="table-header">
            <h2>${escapeHtml(t.orders)}</h2>
            <button id="refresh-admin" class="secondary-btn" type="button">${escapeHtml(t.refresh)}</button>
          </div>
          <div id="orders-list" class="table-wrap"></div>
        </div>
      </section>
    `,
    scripts: `<script>window.__ADMIN_I18N__=${JSON.stringify(getTranslations(lang).adminJs)};</script><script src="/admin.js"></script>`
  });
}

export function legalPage(kind, options = {}) {
  const lang = normalizeLanguage(options.lang);
  const t = getTranslations(lang);
  const b = config.business;
  let page = t.legal[kind] || t.legal.service;
  let body;
  if (kind === "contacts") {
    const labels = t.legal.contacts.labels;
    body = `
      <h1>${escapeHtml(t.legal.contacts.title)}</h1>
      <dl class="details">
        <dt>${escapeHtml(labels.enterprise)}</dt><dd>${escapeHtml(b.name)}</dd>
        <dt>${escapeHtml(labels.countryCity)}</dt><dd>${escapeHtml(b.country)}, ${escapeHtml(b.city)}</dd>
        <dt>${escapeHtml(labels.legalAddress)}</dt><dd>${escapeHtml(b.legalAddress)}</dd>
        <dt>${escapeHtml(labels.actualAddress)}</dt><dd>${escapeHtml(b.actualAddress)}</dd>
        <dt>${escapeHtml(labels.bin)}</dt><dd>${escapeHtml(b.bin)}</dd>
        <dt>${escapeHtml(labels.workHours)}</dt><dd>${escapeHtml(b.workHours)}</dd>
        <dt>${escapeHtml(labels.supportPhone)}</dt><dd>${escapeHtml(b.supportPhone)}</dd>
        <dt>${escapeHtml(labels.supportEmail)}</dt><dd><a href="mailto:${escapeHtml(b.supportEmail)}">${escapeHtml(b.supportEmail)}</a></dd>
      </dl>
    `;
  } else {
    body = page.body(b);
  }

  return layout({
    title: page.title,
    lang,
    path: options.path || `/${kind}`,
    query: options.query || {},
    body: `<section class="doc-page panel">${body}</section>`
  });
}
