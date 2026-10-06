import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { getLegalContent } from "./legal";
import { getLandingContent } from "./landing";

const supportedLanguages = ["ru", "kk", "en"];
const defaultApiBaseUrl = import.meta.env.PROD ? "https://clinmedkazserver.nnmc.kz/api" : "/api";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");
const adminJwtStorageKey = "clinmed_admin_jwt";

// "Remember me" keeps the JWT in localStorage (survives browser restarts until the token expires);
// otherwise it lives in sessionStorage and is dropped when the tab closes.
// Storage access can throw (Safari "Block all cookies", some private modes); the site must still
// work for authors, so every access is guarded and the token falls back to memory for this page.
let memoryAdminJwt = "";

// Takes the storage name, not the object: in some browsers even reading window.localStorage throws.
function readStorage(name, key) {
  try {
    return window[name].getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(name, key, value) {
  try {
    if (value === null) window[name].removeItem(key);
    else window[name].setItem(key, value);
  } catch {}
}

function adminJwt() {
  return readStorage("sessionStorage", adminJwtStorageKey) || readStorage("localStorage", adminJwtStorageKey) || memoryAdminJwt;
}

function setAdminJwt(jwt, remember = false) {
  clearAdminJwt();
  memoryAdminJwt = jwt;
  writeStorage(remember ? "localStorage" : "sessionStorage", adminJwtStorageKey, jwt);
  markAdminDevice(true);
}

// Marks this browser as an admin's, in localStorage so that every tab sees it - including the
// noopener tabs the admin "Open" buttons create, which do not inherit a sessionStorage token.
// Payment pages opened here are not counted as the author opening the link. Cleared on logout.
const adminDeviceStorageKey = "clinmed_admin_device";

function markAdminDevice(value) {
  writeStorage("localStorage", adminDeviceStorageKey, value ? "1" : null);
}

// Admins signed in before this marker existed get it on their next page load.
if (adminJwt()) markAdminDevice(true);

function isAdminDevice() {
  return readStorage("localStorage", adminDeviceStorageKey) === "1";
}

function clearAdminJwt() {
  memoryAdminJwt = "";
  writeStorage("sessionStorage", adminJwtStorageKey, null);
  writeStorage("localStorage", adminJwtStorageKey, null);
}

function shouldAttachAdminJwt(path) {
  return path.startsWith("/admin") || path.startsWith("/invitations");
}

function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = adminJwt();
  if (token && shouldAttachAdminJwt(path) && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${apiBaseUrl}${path}`, { credentials: "include", ...options, headers });
}

let halykPaymentScriptPromise = null;

function loadHalykPaymentApi(src) {
  if (window.halyk?.pay) return Promise.resolve();
  if (halykPaymentScriptPromise) return halykPaymentScriptPromise;

  halykPaymentScriptPromise = new Promise((resolve, reject) => {
    const previous = document.querySelector("script[data-halyk-payment-api]");
    if (previous) previous.remove();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.halykPaymentApi = "true";
    script.onload = () => {
      if (window.halyk?.pay) {
        resolve();
        return;
      }
      script.remove();
      halykPaymentScriptPromise = null;
      reject(new Error("Halyk payment API is unavailable."));
    };
    script.onerror = () => {
      script.remove();
      halykPaymentScriptPromise = null;
      reject(new Error("Could not load Halyk payment API."));
    };
    document.head.append(script);
  });

  return halykPaymentScriptPromise;
}

// Strapi answers with { error: { status, name, message } }, plain throws give { error: "text" }.
function errorMessage(payload, fallback) {
  const error = payload?.error;
  if (typeof error === "string" && error) return error;
  if (error && typeof error.message === "string" && error.message) return error.message;
  return fallback;
}

const apiErrorI18n = {
  ru: {
    "Full name is required.": "Укажите ФИО.",
    "Valid email is required.": "Укажите корректный Email.",
    "Phone number is required.": "Укажите номер телефона.",
    "Article title is required.": "Укажите название статьи.",
    "Country is required for an individual price.": "Укажите страну для индивидуальной цены.",
    "Payment link is invalid or cancelled.": "Ссылка на оплату недействительна или отменена.",
    "This article publication has already been paid.": "Публикация этой статьи уже оплачена.",
    "This article has already been paid through another link.": "Эта статья уже оплачена по другой ссылке.",
    "Payment provider is temporarily unavailable.": "Платёжный сервис временно недоступен. Попробуйте позже.",
    "Payments are temporarily unavailable.": "Оплата временно недоступна. Попробуйте позже.",
    "Could not load the National Bank exchange rate.": "Не удалось получить курс Нацбанка. Попробуйте позже или укажите курс вручную.",
    "Cannot resend a cancelled invitation.": "Нельзя повторно отправить отменённую ссылку.",
  },
  kk: {
    "Full name is required.": "Т.А.Ә. енгізіңіз.",
    "Valid email is required.": "Дұрыс Email енгізіңіз.",
    "Phone number is required.": "Телефон нөмірін енгізіңіз.",
    "Article title is required.": "Мақала атауын енгізіңіз.",
    "Country is required for an individual price.": "Жеке баға үшін елді көрсетіңіз.",
    "Payment link is invalid or cancelled.": "Төлем сілтемесі жарамсыз немесе жойылған.",
    "This article publication has already been paid.": "Бұл мақаланы жариялау ақысы төленген.",
    "This article has already been paid through another link.": "Бұл мақала басқа сілтеме арқылы төленген.",
    "Payment provider is temporarily unavailable.": "Төлем сервисі уақытша қолжетімсіз. Кейінірек қайталаңыз.",
    "Payments are temporarily unavailable.": "Төлем уақытша қолжетімсіз. Кейінірек қайталаңыз.",
    "Could not load the National Bank exchange rate.": "Ұлттық банк бағамын алу мүмкін болмады. Кейінірек қайталаңыз немесе бағамды қолмен көрсетіңіз.",
    "Cannot resend a cancelled invitation.": "Жойылған сілтемені қайта жіберуге болмайды.",
  },
  en: {
    "Country is required for an individual price.": "Enter a country for the individual price.",
    "Payments are temporarily unavailable.": "Payments are temporarily unavailable. Please try again later.",
    "Could not load the National Bank exchange rate.": "Could not load the National Bank rate. Try again later or enter the rate manually.",
  },
};

function localizedErrorMessage(payload, lang, fallback) {
  const message = errorMessage(payload, fallback);
  return apiErrorI18n[lang]?.[message] || message;
}

const ariaI18n = {
  ru: { menu: "Меню", legal: "Правовые документы", adminSections: "Разделы администрирования" },
  kk: { menu: "Мәзір", legal: "Құқықтық құжаттар", adminSections: "Басқару бөлімдері" },
  en: { menu: "Menu", legal: "Legal documents", adminSections: "Administration sections" },
};

const paymentLogos = [
  { name: "epay-halyk.png", label: "Halyk ePay", className: "payment-logo-epay payment-logo-dark" },
  { name: "halyk-bank.png", label: "Halyk Bank", className: "payment-logo-bank" },
  { name: "visa.svg", label: "Visa", className: "payment-logo-card" },
  { name: "mastercard.svg", label: "Mastercard", className: "payment-logo-card" },
  { name: "three-d-secure.svg", label: "3D Secure", className: "payment-logo-3ds" },
  { name: "visa-secure.png", label: "Visa Secure", className: "payment-logo-visa-secure" },
];

const i18n = {
  ru: {
    nav: ["Главная", "О журнале", "Публикация", "Стоимость", "Контакты"],
    navPayment: "Оплатить статью",
    payment: {
      title: "Оплата публикации статьи",
      eyebrow: "Научная публикация ClinMedKaz",
      lead: "Заполните данные автора и перейдите к безопасной оплате картой через Halyk ePay.",
      amount: "Сумма",
      individualPrice: "Индивидуальная цена по этой ссылке",
      authorDetails: "Данные автора",
      fullName: "ФИО",
      email: "Email",
      phone: "Номер телефона",
      articleTitle: "Название статьи",
      residency: "Резидентство",
      resident: "Резидент Казахстана",
      nonResident: "Нерезидент Казахстана",
      agreement: "Я согласен с публичной офертой, политикой конфиденциальности и правилами возврата.",
      submit: "Перейти к оплате",
      invitationRequired: "Оплата доступна только по персональной ссылке администратора.",
      processTitle: "Порядок оплаты",
      steps: ["Автор заполняет данные.", "Система открывает Halyk ePay.", "После оплаты администратор получает уведомление.", "Статья публикуется после подтверждения оплаты."],
    },
    pay: { title: "Переход к оплате", lead: "Проверяем заказ и открываем защищённую страницу Halyk ePay.", button: "Открыть форму оплаты", retry: "Повторить попытку", loading: "Подключаемся к Halyk ePay…", error: "Платёжный сервис временно не отвечает. Повторите попытку через минуту.", amount: "К оплате", article: "Публикация", order: "Номер заказа", security: "Оплата проходит на защищённой странице Halyk ePay", back: "Вернуться к данным" },
    result: { ok: "Оплата получена", fail: "Оплата не прошла", refunded: "Оплата возвращена", refundedHelp: "Средства по этому заказу возвращены на карту, с которой была произведена оплата. Срок зачисления зависит от вашего банка.", pending: "Проверяем оплату", checking: "Сверяем статус с Halyk ePay…", pendingHelp: "Банк ещё не подтвердил итоговый статус. Обновите страницу через несколько секунд.", back: "Вернуться к форме оплаты" },
    admin: { title: "Администрирование оплат", login: "Вход в панель управления", loginTitle: "Панель управления оплатами", loginLead: "Авторизуйтесь, чтобы создавать платежные ссылки и просматривать транзакции.", username: "Логин", password: "Пароль", signIn: "Войти", rememberMe: "Запомнить меня", logout: "Выйти", create: "Создать ссылку", creating: "Создаём ссылку…", createLead: "Заполните данные автора, выберите язык письма и отправьте персональную ссылку на оплату.", orders: "История транзакций", ordersLead: "Отслеживайте созданные ссылки и статусы оплат в одном списке.", refresh: "Обновить", syncing: "Сверяем с Halyk…", syncWarning: "История загружена, но Halyk временно не ответил. Показаны последние сохранённые статусы.", noAccess: "У этой учетной записи нет доступа к управлению оплатами.", sessionExpired: "Сессия истекла. Войдите снова.", invalidCredentials: "Неверный логин или пароль.", loginRequired: "Введите логин и пароль.", authError: "Не удалось выполнить вход. Проверьте данные и повторите попытку.", loadError: "Не удалось загрузить панель управления.", email: "Email", fullName: "ФИО", phone: "Телефон", country: "Страна", article: "Статья", lang: "Язык", customPrice: "Установить индивидуальную цену", customPriceAmount: "Индивидуальная сумма", customPriceCurrency: "Валюта", customPriceHint: "Используйте для скидки или специальной цены. Она будет зафиксирована только для этой ссылки.", sendEmail: "Отправить ссылку на Email", createdLink: "Ссылка создана", status: "Статус", invoice: "Инвойс", author: "Автор", amount: "Сумма", createdAt: "Создано", search: "Поиск по автору, email, статье, стране или инвойсу", allStatuses: "Все статусы", dateFrom: "Дата с", dateTo: "Дата по", emptyOrders: "Записей пока нет.", open: "Открыть", transactions: "Транзакции", pricing: "Цена", pricingPreview: "Так цена будет показана на сайте", pricingSave: "Сохранить цену", pricingSaving: "Сохраняем…", pricingSaved: "Цена обновлена. Новые ссылки будут создаваться с этой суммой.", pricingFrozen: "Уже отправленные ссылки на оплату сохраняют сумму, с которой были созданы, — изменение цены их не затронет.", pricingFromEnv: "Сейчас действует значение по умолчанию из настроек сервера.", pricingUpdatedBy: "Изменено" },
    legal: { service: "Описание услуги", terms: "Публичная оферта", privacy: "Политика конфиденциальности", refunds: "Правила возврата", contacts: "Контакты" },
  },
  kk: {
    nav: ["Басты бет", "Журнал туралы", "Жариялау", "Құны", "Байланыс"],
    navPayment: "Мақаланы төлеу",
    payment: {
      title: "Мақаланы жариялау ақысын төлеу",
      eyebrow: "ClinMedKaz ғылыми жарияланымы",
      lead: "Автор деректерін толтырып, Halyk ePay арқылы қауіпсіз төлемге өтіңіз.",
      amount: "Сома",
      individualPrice: "Осы сілтеме үшін жеке баға",
      authorDetails: "Автор деректері",
      fullName: "Т.А.Ә.",
      email: "Email",
      phone: "Телефон",
      articleTitle: "Мақала атауы",
      residency: "Резиденттік",
      resident: "Қазақстан резиденті",
      nonResident: "Қазақстан резиденті емес",
      agreement: "Мен жария офертамен, құпиялылық саясатымен және қайтару ережелерімен келісемін.",
      submit: "Төлемге өту",
      invitationRequired: "Төлем тек әкімші жіберген жеке сілтеме арқылы қолжетімді.",
      processTitle: "Төлем тәртібі",
      steps: ["Автор деректерді толтырады.", "Жүйе Halyk ePay ашады.", "Төлемнен кейін әкімші хабарлама алады.", "Мақала төлем расталғаннан кейін жарияланады."],
    },
    pay: { title: "Төлемге өту", lead: "Тапсырысты тексеріп, Halyk ePay қорғалған бетін ашамыз.", button: "Төлем формасын ашу", retry: "Қайталап көру", loading: "Halyk ePay жүйесіне қосылуда…", error: "Төлем сервисі уақытша жауап бермейді. Бір минуттан кейін қайталап көріңіз.", amount: "Төлем сомасы", article: "Жарияланым", order: "Тапсырыс нөмірі", security: "Төлем Halyk ePay қорғалған бетінде жүргізіледі", back: "Деректерге оралу" },
    result: { ok: "Төлем қабылданды", fail: "Төлем өтпеді", refunded: "Төлем қайтарылды", refundedHelp: "Осы тапсырыс бойынша қаражат төлем жасалған картаға қайтарылды. Есепке түсу мерзімі сіздің банкіңізге байланысты.", pending: "Төлем тексерілуде", checking: "Halyk ePay мәртебесі тексерілуде…", pendingHelp: "Банк соңғы мәртебені әлі растаған жоқ. Бірнеше секундтан кейін бетті жаңартыңыз.", back: "Төлем формасына оралу" },
    admin: { title: "Төлемдерді басқару", login: "Басқару панеліне кіру", loginTitle: "Төлемдерді басқару панелі", loginLead: "Төлем сілтемелерін жасау және транзакцияларды қарау үшін авторизациядан өтіңіз.", username: "Логин", password: "Құпиясөз", signIn: "Кіру", rememberMe: "Мені есте сақтау", logout: "Шығу", create: "Сілтеме жасау", creating: "Сілтеме жасалуда…", createLead: "Автор деректерін енгізіп, хат тілін таңдаңыз және жеке төлем сілтемесін жіберіңіз.", orders: "Транзакциялар тарихы", ordersLead: "Жасалған сілтемелер мен төлем мәртебелерін бір тізімде бақылаңыз.", refresh: "Жаңарту", noAccess: "Бұл есептік жазбада төлемдерді басқаруға рұқсат жоқ.", sessionExpired: "Сессия мерзімі аяқталды. Қайта кіріңіз.", invalidCredentials: "Логин немесе құпиясөз дұрыс емес.", loginRequired: "Логин мен құпиясөзді енгізіңіз.", authError: "Кіру мүмкін болмады. Деректерді тексеріп, қайталап көріңіз.", loadError: "Басқару панелін жүктеу мүмкін болмады.", email: "Email", fullName: "Т.А.Ә.", phone: "Телефон", country: "Ел", article: "Мақала", lang: "Тіл", customPrice: "Жеке баға белгілеу", customPriceAmount: "Жеке сома", customPriceCurrency: "Валюта", customPriceHint: "Жеңілдік немесе арнайы баға үшін пайдаланыңыз. Ол тек осы сілтеме үшін бекітіледі.", sendEmail: "Сілтемені Email арқылы жіберу", createdLink: "Сілтеме жасалды", status: "Мәртебе", invoice: "Инвойс", author: "Автор", amount: "Сома", createdAt: "Жасалды", search: "Автор, email, мақала, ел немесе инвойс бойынша іздеу", allStatuses: "Барлық мәртебелер", dateFrom: "Бастапқы күн", dateTo: "Соңғы күн", emptyOrders: "Жазбалар әлі жоқ.", open: "Ашу", transactions: "Транзакциялар", pricing: "Баға", pricingPreview: "Баға сайтта осылай көрсетіледі", pricingSave: "Бағаны сақтау", pricingSaving: "Сақталуда…", pricingSaved: "Баға жаңартылды. Жаңа сілтемелер осы сомамен жасалады.", pricingFrozen: "Жіберілген төлем сілтемелері жасалған кездегі сомасын сақтайды — баға өзгерісі оларға әсер етпейді.", pricingFromEnv: "Қазір сервер параметрлеріндегі әдепкі мән қолданылады.", pricingUpdatedBy: "Өзгертілді" },
    legal: { service: "Қызмет сипаттамасы", terms: "Жария оферта", privacy: "Құпиялылық саясаты", refunds: "Қайтару ережелері", contacts: "Байланыс" },
  },
  en: {
    nav: ["Home", "About", "Publish", "Pricing", "Contacts"],
    navPayment: "Pay for article",
    payment: {
      title: "Article publication payment",
      eyebrow: "ClinMedKaz scientific publication",
      lead: "Complete author details and proceed to secure Halyk ePay card payment.",
      amount: "Amount",
      individualPrice: "Individual price for this link",
      authorDetails: "Author details",
      fullName: "Full name",
      email: "Email",
      phone: "Phone number",
      articleTitle: "Article title",
      residency: "Residency",
      resident: "Kazakhstan resident",
      nonResident: "Non-resident of Kazakhstan",
      agreement: "I agree with the public offer, privacy policy and refund rules.",
      submit: "Proceed to payment",
      invitationRequired: "Payment is available only through the personal link sent by the administrator.",
      processTitle: "Payment process",
      steps: ["Author fills in payment details.", "The system opens Halyk ePay.", "The administrator receives notification.", "The article is published after payment confirmation."],
    },
    pay: { title: "Proceed to payment", lead: "We are checking your order and opening the secure Halyk ePay page.", button: "Open payment form", retry: "Try again", loading: "Connecting to Halyk ePay…", error: "The payment service is temporarily unavailable. Please try again in a minute.", amount: "Amount due", article: "Publication", order: "Order number", security: "Payment is completed on the secure Halyk ePay page", back: "Back to details" },
    result: { ok: "Payment received", fail: "Payment failed", refunded: "Payment refunded", refundedHelp: "The funds for this order have been returned to the card used for payment. The time it takes to arrive depends on your bank.", pending: "Checking payment", checking: "Checking the status with Halyk ePay…", pendingHelp: "The bank has not confirmed the final status yet. Refresh the page in a few seconds.", back: "Back to payment form" },
    admin: { title: "Payment administration", login: "Management portal sign in", loginTitle: "Payment management portal", loginLead: "Sign in to create payment links and review transaction history.", username: "Username", password: "Password", signIn: "Sign in", rememberMe: "Remember me", logout: "Logout", create: "Create link", creating: "Creating link…", createLead: "Enter author details, choose the email language and send a personal payment link.", orders: "Transaction history", ordersLead: "Track created links and payment statuses in one list.", refresh: "Refresh", noAccess: "This account does not have access to payment administration.", sessionExpired: "Session expired. Sign in again.", invalidCredentials: "Invalid username or password.", loginRequired: "Enter username and password.", authError: "Could not sign in. Check the details and try again.", loadError: "Could not load the management portal.", email: "Email", fullName: "Full name", phone: "Phone", country: "Country", article: "Article", lang: "Language", customPrice: "Set an individual price", customPriceAmount: "Individual amount", customPriceCurrency: "Currency", customPriceHint: "Use for a discount or special price. It is fixed only for this link.", sendEmail: "Send link by email", createdLink: "Link created", status: "Status", invoice: "Invoice", author: "Author", amount: "Amount", createdAt: "Created", search: "Search author, email, article, country or invoice", allStatuses: "All statuses", dateFrom: "Date from", dateTo: "Date to", emptyOrders: "No records yet.", open: "Open", transactions: "Transactions", pricing: "Price", pricingPreview: "How the price will appear on the site", pricingSave: "Save price", pricingSaving: "Saving…", pricingSaved: "Price updated. New links will be created with this amount.", pricingFrozen: "Payment links already sent keep the amount they were created with — a price change does not affect them.", pricingFromEnv: "The server default is currently in effect.", pricingUpdatedBy: "Updated" },
    legal: { service: "Service description", terms: "Public offer", privacy: "Privacy policy", refunds: "Refund policy", contacts: "Contacts" },
  },
};

const availabilityI18n = {
  ru: {
    title: "Оплата временно недоступна",
    message: "Мы подключаем Halyk ePay. Сайт и информационные разделы работают в обычном режиме, но создать или оплатить ссылку пока нельзя.",
    nav: "Оплата недоступна",
    admin: "Платежи отключены. Создание и повторная отправка ссылок станут доступны после подключения Halyk ePay.",
  },
  kk: {
    title: "Төлем уақытша қолжетімсіз",
    message: "Halyk ePay қосылып жатыр. Сайт пен ақпараттық бөлімдер қалыпты жұмыс істейді, бірақ төлем сілтемесін әзірге жасауға немесе төлеуге болмайды.",
    nav: "Төлем қолжетімсіз",
    admin: "Төлемдер өшірілген. Сілтемелерді жасау және қайта жіберу Halyk ePay қосылғаннан кейін қолжетімді болады.",
  },
  en: {
    title: "Payments are temporarily unavailable",
    message: "We are connecting Halyk ePay. The website and information pages remain available, but payment links cannot be created or paid yet.",
    nav: "Payments unavailable",
    admin: "Payments are disabled. Creating and resending links will become available after Halyk ePay is connected.",
  },
};

const adminUiI18n = {
  ru: {
    required: "Обязательное поле",
    optional: "Необязательно",
    digitsOnly: "Только цифры",
    unknownStatus: "Неизвестный статус",
    warnings: {
      alreadyPaid: "Эта статья уже была оплачена.",
      activeLinkExists: "Для этой статьи уже существует активная ссылка на оплату.",
    },
    statuses: {
      invitation_created: "Ссылка создана",
      invitation_opened: "Ссылка открыта",
      created: "Создан",
      token_issued: "Ожидает оплаты",
      payment_started: "Оплата начата",
      paid: "Оплачен",
      failed: "Оплата не прошла",
      postlink_rejected: "Подтверждение отклонено",
      cancelled: "Отменён",
      refunded: "Возврат выполнен",
    },
  },
  kk: {
    required: "Міндетті өріс",
    optional: "Міндетті емес",
    digitsOnly: "Тек сандар",
    unknownStatus: "Белгісіз мәртебе",
    warnings: {
      alreadyPaid: "Бұл мақаланың ақысы төленген.",
      activeLinkExists: "Бұл мақала үшін белсенді төлем сілтемесі бұрыннан бар.",
    },
    statuses: {
      invitation_created: "Сілтеме жасалды",
      invitation_opened: "Сілтеме ашылды",
      created: "Жасалды",
      token_issued: "Төлем күтілуде",
      payment_started: "Төлем басталды",
      paid: "Төленді",
      failed: "Төлем өтпеді",
      postlink_rejected: "Растау қабылданбады",
      cancelled: "Бас тартылды",
      refunded: "Қаражат қайтарылды",
    },
  },
  en: {
    required: "Required field",
    optional: "Optional",
    digitsOnly: "Digits only",
    unknownStatus: "Unknown status",
    warnings: {
      alreadyPaid: "This article has already been paid for.",
      activeLinkExists: "An active payment link already exists for this article.",
    },
    statuses: {
      invitation_created: "Link created",
      invitation_opened: "Link opened",
      created: "Created",
      token_issued: "Awaiting payment",
      payment_started: "Payment started",
      paid: "Paid",
      failed: "Payment failed",
      postlink_rejected: "Confirmation rejected",
      cancelled: "Cancelled",
      refunded: "Refunded",
    },
  },
};

const adminSyncI18n = {
  ru: { syncing: "Сверяем с Halyk…", loading: "Загружаем транзакции…", warning: "История загружена, но Halyk временно не ответил. Показаны последние сохранённые статусы." },
  kk: { syncing: "Halyk-пен салыстырылуда…", loading: "Транзакциялар жүктелуде…", warning: "Тарих жүктелді, бірақ Halyk уақытша жауап бермеді. Соңғы сақталған мәртебелер көрсетілді." },
  en: { syncing: "Checking with Halyk…", loading: "Loading transactions…", warning: "The history loaded, but Halyk did not respond. The latest saved statuses are shown." },
};

const adminPricingI18n = {
  ru: {
    lead: "Задайте стоимость в удобной валюте — вторая сумма рассчитается по курсу. Резиденты РК платят в тенге, нерезиденты — в долларах.",
    baseCurrency: "Валюта, в которой задаётся цена",
    baseKzt: "Тенге (KZT) — сумма в USD считается по курсу",
    baseUsd: "Доллары (USD) — сумма в тенге считается по курсу",
    priceIn: { KZT: "Стоимость публикации, ₸", USD: "Стоимость публикации, $" },
    rateMode: "Курс USD/KZT",
    rateAuto: "Официальный курс Нацбанка РК — обновляется автоматически каждый день",
    rateManual: "Указать курс вручную",
    rate: "Курс, ₸ за 1 USD",
    official: "Курс НБ РК",
    officialOn: (date) => `на ${date}`,
    officialLoading: "Загружаем курс Нацбанка…",
    officialError: "Не удалось получить курс Нацбанка. Попробуйте позже или укажите курс вручную.",
    autoNote: "Цена второй валюты будет меняться вместе с курсом. Уже отправленные ссылки сохраняют сумму, с которой были созданы.",
    invalid: "Укажите стоимость и курс числами больше нуля.",
  },
  kk: {
    lead: "Құнды ыңғайлы валютада көрсетіңіз — екінші сома бағам бойынша есептеледі. ҚР резиденттері теңгемен, резидент еместер долламен төлейді.",
    baseCurrency: "Баға белгіленетін валюта",
    baseKzt: "Теңге (KZT) — USD сомасы бағам бойынша есептеледі",
    baseUsd: "Доллар (USD) — теңге сомасы бағам бойынша есептеледі",
    priceIn: { KZT: "Жариялау құны, ₸", USD: "Жариялау құны, $" },
    rateMode: "USD/KZT бағамы",
    rateAuto: "ҚР Ұлттық банкінің ресми бағамы — күн сайын автоматты түрде жаңартылады",
    rateManual: "Бағамды қолмен көрсету",
    rate: "Бағам, 1 USD үшін ₸",
    official: "ҚР ҰБ бағамы",
    officialOn: (date) => `${date} күнгі`,
    officialLoading: "Ұлттық банк бағамы жүктелуде…",
    officialError: "Ұлттық банк бағамын алу мүмкін болмады. Кейінірек қайталаңыз немесе бағамды қолмен көрсетіңіз.",
    autoNote: "Екінші валютадағы баға бағаммен бірге өзгереді. Жіберілген сілтемелер жасалған кездегі сомасын сақтайды.",
    invalid: "Құн мен бағамды нөлден үлкен сан ретінде көрсетіңіз.",
  },
  en: {
    lead: "Set the fee in whichever currency is convenient — the other amount is derived from the rate. Kazakhstan residents pay in tenge, non-residents in US dollars.",
    baseCurrency: "Currency the price is set in",
    baseKzt: "Tenge (KZT) — the USD amount follows the rate",
    baseUsd: "US dollars (USD) — the tenge amount follows the rate",
    priceIn: { KZT: "Publication fee, ₸", USD: "Publication fee, $" },
    rateMode: "USD/KZT rate",
    rateAuto: "Official National Bank of Kazakhstan rate — updated automatically every day",
    rateManual: "Enter the rate manually",
    rate: "Rate, ₸ per 1 USD",
    official: "National Bank rate",
    officialOn: (date) => `on ${date}`,
    officialLoading: "Loading the National Bank rate…",
    officialError: "Could not load the National Bank rate. Try again later or enter the rate manually.",
    autoNote: "The amount in the other currency will move with the rate. Links already sent keep the amount they were created with.",
    invalid: "Enter the fee and the rate as numbers greater than zero.",
  },
};

const linkOpensI18n = {
  ru: {
    never: "Ещё не открывалась",
    opened: (count) => `Открыта ${count} ${new Intl.PluralRules("ru").select(count) === "few" ? "раза" : "раз"}`,
    first: "впервые",
    last: "последний раз",
  },
  kk: { never: "Әлі ашылған жоқ", opened: (count) => `${count} рет ашылды`, first: "алғаш", last: "соңғы рет" },
  en: { never: "Not opened yet", opened: (count) => (count === 1 ? "Opened once" : `Opened ${count} times`), first: "first", last: "last" },
};

function LinkOpens({ entry, lang }) {
  const t = linkOpensI18n[lang] || linkOpensI18n.ru;
  if (!entry.openCount) return entry.status === "cancelled" ? null : <small className="link-opens">{t.never}</small>;
  const repeat = entry.openCount > 1 && entry.lastOpenedAt && entry.lastOpenedAt !== entry.firstOpenedAt;
  return (
    <small className="link-opens is-opened">
      {t.opened(entry.openCount)} · {t.first} {formatDate(entry.firstOpenedAt, lang)}
      {repeat ? ` · ${t.last} ${formatDate(entry.lastOpenedAt, lang)}` : ""}
    </small>
  );
}

// Tells the server the author has seen the payment page. Only a rendered, visible tab counts
// (link scanners usually just fetch the URL), admins checking a link are skipped, and a
// reload in the same tab is not a new open.
function useInvitationOpened(invitation) {
  useEffect(() => {
    if (!invitation?.id || ["paid", "cancelled"].includes(invitation.status) || adminJwt() || isAdminDevice()) return;
    // Automated browsers (link "detonation" sandboxes included) expose navigator.webdriver.
    if (navigator.webdriver) return;
    const key = `clinmed_invite_opened_${invitation.id}`;
    if (readStorage("sessionStorage", key)) return;
    let sent = false;
    function report() {
      if (sent || document.visibilityState !== "visible") return;
      sent = true;
      writeStorage("sessionStorage", key, "1");
      apiFetch(`/invitations/${encodeURIComponent(invitation.id)}/opened`, { method: "POST", keepalive: true }).catch(() => {});
    }
    report();
    document.addEventListener("visibilitychange", report);
    return () => document.removeEventListener("visibilitychange", report);
  }, [invitation?.id, invitation?.status]);
}

const receiptI18n = {
  ru: { download: "Скачать квитанцию (PDF)", sent: "Квитанция об оплате также отправлена на ваш email.", admin: "Квитанция", error: "Не удалось скачать квитанцию." },
  kk: { download: "Түбіртекті жүктеу (PDF)", sent: "Төлем түбіртегі сіздің email-ге де жіберілді.", admin: "Түбіртек", error: "Түбіртекті жүктеу мүмкін болмады." },
  en: { download: "Download receipt (PDF)", sent: "The payment receipt has also been sent to your email.", admin: "Receipt", error: "Could not download the receipt." },
};

const adminPaginationI18n = {
  ru: { search: "Найти", previous: "Назад", next: "Далее", perPage: "На странице", total: (count) => `Всего: ${count}`, page: (current, count) => `Страница ${current} из ${count}` },
  kk: { search: "Іздеу", previous: "Артқа", next: "Келесі", perPage: "Бетте", total: (count) => `Барлығы: ${count}`, page: (current, count) => `${current} / ${count} бет` },
  en: { search: "Search", previous: "Previous", next: "Next", perPage: "Per page", total: (count) => `Total: ${count}`, page: (current, count) => `Page ${current} of ${count}` },
};

const dateLocales = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
// Browsers report "kk" as supported but often ship without its data and silently fall back
// to the root locale ("2026 M10 6", "136,494.5"). Kazakh shares Russian number conventions,
// and dates are assembled by hand in the CLDR kk pattern ("2026 ж. 06 қаз., 11:30").
const numberLocales = { ru: "ru-RU", kk: "ru-RU", en: "en-US" };
const kkShortMonths = ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."];

function formatNumber(value, lang = "ru", options = {}) {
  return new Intl.NumberFormat(numberLocales[lang] || numberLocales.ru, options).format(Number(value || 0));
}

function formatKkDate(date, withTime) {
  const day = `${date.getFullYear()} ж. ${String(date.getDate()).padStart(2, "0")} ${kkShortMonths[date.getMonth()]}`;
  return withTime ? `${day}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : day;
}

function formatDay(isoDate, lang = "ru") {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (lang === "kk") return formatKkDate(date, false);
  return new Intl.DateTimeFormat(dateLocales[lang] || dateLocales.ru, { dateStyle: "medium" }).format(date);
}

function adminStatusLabel(status, lang) {
  const ui = adminUiI18n[lang] || adminUiI18n.ru;
  return ui.statuses[status] || ui.unknownStatus;
}

function AdminFieldLabel({ children, lang, optional = false }) {
  const ui = adminUiI18n[lang] || adminUiI18n.ru;
  return (
    <span className="field-label">
      <span>{children}{!optional && <span className="field-required" aria-hidden="true">*</span>}</span>
      {optional && <span className="field-optional">{ui.optional}</span>}
    </span>
  );
}

function money(amount, currency, lang = "ru") {
  return `${formatNumber(amount, lang, { maximumFractionDigits: currency === "KZT" ? 0 : 2 })} ${currency}`;
}

function localizedPath(path, lang, search = "") {
  const params = new URLSearchParams(search);
  params.set("lang", lang);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

function formatDate(value, lang = "ru") {
  if (!value) return "-";
  const date = new Date(value);
  if (lang === "kk") return formatKkDate(date, true);
  return new Intl.DateTimeFormat(dateLocales[lang] || dateLocales.ru, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function dateFilterBoundary(value, end = false) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + (end ? 1 : 0));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function PaymentLink({ enabled, className, href, onClick, unavailableLabel, children }) {
  if (!enabled) {
    return <span className={`${className} is-disabled`} aria-disabled="true" title={unavailableLabel}>{children}</span>;
  }
  return <a className={className} href={href} onClick={onClick}>{children}</a>;
}

function Nav({ lang, path, search, paymentsEnabled, onNavigate, onChangeLang }) {
  const t = i18n[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [["/", ""], ["/", "about"], ["/", "process"], ["/", "pricing"], ["/", "contact"]];
  function go(event, base, hash) {
    event.preventDefault();
    setMenuOpen(false);
    if (window.location.pathname !== base) onNavigate(base);
    if (hash) {
      window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), window.location.pathname !== base ? 400 : 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function switchLang(event, nextLang) {
    event.preventDefault();
    onChangeLang(nextLang);
  }
  return (
    <nav className={`top-nav${menuOpen ? " menu-open" : ""}`}>
      <div className="top-nav-inner">
        <a className="brand" href={localizedPath("/", lang)} onClick={(event) => go(event, "/", "")}><span className="brand-mark">CM</span><span>ClinMedKaz</span></a>
        <button className="menu-toggle" type="button" aria-controls="primary-menu" aria-expanded={menuOpen} aria-label={ariaI18n[lang].menu} onClick={() => setMenuOpen((value) => !value)}><span /><span /><span /></button>
        <div className="nav-links" id="primary-menu">
          {links.map(([base, hash], index) => <a key={index} href={localizedPath(base, lang)} onClick={(event) => go(event, base, hash)}>{t.nav[index]}</a>)}
          <PaymentLink
            enabled={paymentsEnabled}
            className="nav-pay-link"
            href={localizedPath("/payment", lang)}
            onClick={(event) => go(event, "/payment", "")}
            unavailableLabel={availabilityI18n[lang].message}
          >
            {paymentsEnabled ? t.navPayment : availabilityI18n[lang].nav}
          </PaymentLink>
        </div>
        <div className="lang-switch">{supportedLanguages.map((item) => <a key={item} className={item === lang ? "active" : ""} href={localizedPath(path, item, search)} onClick={(event) => switchLang(event, item)}>{item.toUpperCase()}</a>)}</div>
      </div>
    </nav>
  );
}

function Footer({ ctx, lang, onNavigate }) {
  const b = ctx.config.business;
  const t = i18n[lang].legal;
  const legalLinks = [["/service", t.service], ["/terms", t.terms], ["/privacy", t.privacy], ["/refunds", t.refunds], ["/contacts", t.contacts]];
  function go(event, href) {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  }
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div><strong>{b.name}</strong><br />{b.country}, {b.city}<br />Support: <a href={`mailto:${b.supportEmail}`}>{b.supportEmail}</a>, {b.supportPhone}</div>
        {ctx.config.paymentsEnabled !== false && <div className="payment-mark">
          {paymentLogos.map((logo) => (
            <span className={`payment-logo ${logo.className}`} key={logo.name}>
              <img src={`/assets/payments/${logo.name}`} alt={logo.label} />
            </span>
          ))}
        </div>}
      </div>
      <nav className="footer-legal" aria-label={ariaI18n[lang].legal}>
        {legalLinks.map(([href, label]) => (
          <a key={href} href={localizedPath(href, lang)} onClick={(event) => go(event, href)}>{label}</a>
        ))}
      </nav>
      <div className="footer-copy">© {new Date().getFullYear()} {b.name}. {b.bin ? `БИН ${b.bin}` : ""}</div>
    </footer>
  );
}

function ContactIcon({ type }) {
  if (type === "phone") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />
      </svg>
    );
  }
  if (type === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="m22 7-10 7L2 7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Landing({ ctx, lang, onNavigate }) {
  const c = getLandingContent(lang, ctx.config);
  const mailto = c.cta.email ? `mailto:${c.cta.email}?subject=${encodeURIComponent(c.cta.subject)}` : "#contact";
  const paymentHref = localizedPath("/payment", lang);
  const phoneValue = c.contact.cards.find((item) => item.type === "phone")?.value || "";
  const phoneHref = phoneValue.replace(/[^\d+]/g, "");
  const paymentsEnabled = ctx.config.paymentsEnabled !== false;
  const availability = availabilityI18n[lang];
  function contactHref(item) {
    if (item.type === "phone" && phoneHref) return `tel:${phoneHref}`;
    if (item.type === "mail" && item.value) return `mailto:${item.value}`;
    if (item.type === "pin") return c.contact.map.url;
    return undefined;
  }
  return (
    <div className="landing">
      {!paymentsEnabled && (
        <section className="availability-banner" role="status">
          <strong>{availability.title}</strong>
          <span>{availability.message}</span>
        </section>
      )}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="hero-pill">{c.hero.pill}</span>
            <h1>{c.hero.title} <span className="accent">{c.hero.titleAccent}</span></h1>
            <p className="hero-lead">{c.hero.lead}</p>
            <div className="hero-actions">
              <PaymentLink enabled={paymentsEnabled} className="primary-btn" href={paymentHref} onClick={(event) => { event.preventDefault(); onNavigate("/payment"); }} unavailableLabel={availability.message}>{c.hero.primaryCta} <span aria-hidden="true">→</span></PaymentLink>
              <a className="ghost-btn" href={"#about"} onClick={(event) => { event.preventDefault(); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }}>{c.hero.secondaryCta}</a>
            </div>
            <div className="hero-stats">
              {c.stats.slice(0, 3).map((stat) => (
                <div className="hero-stat" key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>
              ))}
            </div>
          </div>
          <aside className="hero-card">
            <div className="hero-card-head">
              <span className="hero-card-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2z" /><path d="M9 3v18" /><path d="M13 7h1M13 11h1" /></svg>
              </span>
              <div><strong>{c.hero.card.title}</strong><span>{c.hero.card.subtitle}</span></div>
            </div>
            <ul className="hero-card-features">
              {c.hero.card.features.map((f) => (
                <li key={f.title}><span className="feat-check">✓</span><div><strong>{f.title}</strong><p>{f.text}</p></div></li>
              ))}
            </ul>
            <PaymentLink enabled={paymentsEnabled} className="primary-btn hero-card-btn" href={paymentHref} onClick={(event) => { event.preventDefault(); onNavigate("/payment"); }} unavailableLabel={availability.message}>{c.hero.card.cta}</PaymentLink>
          </aside>
        </div>
        <a className="hero-scroll" href={"#about"} onClick={(event) => { event.preventDefault(); document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }); }}>
          {c.hero.scroll}
          <span className="hero-scroll-mouse" />
        </a>
      </section>

      <section className="landing-section" id="about">
        <div className="landing-about">
          <div>
            <h2>{c.about.title}</h2>
            {c.about.paragraphs.map((p, i) => <p key={i} className="landing-text">{p}</p>)}
            <div className="official-links">
              <a href="https://www.clinmedkaz.org/" target="_blank" rel="noreferrer">{c.officialLinks.journal}</a>
              <a href="https://www.editorialpark.com/jcmk" target="_blank" rel="noreferrer">{c.officialLinks.submission}</a>
            </div>
          </div>
          <div className="landing-scope">
            <h3>{c.about.scopeTitle}</h3>
            <ul>{c.about.scope.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="landing-section band">
        <h2>{c.benefits.title}</h2>
        <div className="landing-cards">
          {c.benefits.items.map((item) => (
            <article className="benefit-card" key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="process">
        <h2>{c.process.title}</h2>
        <ol className="landing-steps">
          {c.process.steps.map((step, i) => (
            <li key={step.title}><span className="step-num">{i + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="landing-section" id="pricing">
        <div className="landing-pricing">
          <div>
            <h2>{c.pricing.title}</h2>
            <p className="landing-text">{c.pricing.lead}</p>
            <p className="landing-note">{c.pricing.note}</p>
            <button className="secondary-btn" type="button" onClick={() => onNavigate("/service")}>{c.pricing.cta}</button>
          </div>
          <div className="price-badge"><span>{ctx.config.publicationFeeDisplay}</span><small>{c.pricing.secondary}</small></div>
        </div>
      </section>

      <section className="landing-section contact-section" id="contact">
        <h2>{c.contact.title}</h2>
        <div className="contact-cards">
          {c.contact.cards.map((item) => (
            <a className={`contact-card contact-card-${item.type}`} href={contactHref(item)} target={item.type === "pin" ? "_blank" : undefined} rel={item.type === "pin" ? "noreferrer" : undefined} key={item.title}>
              <span className="contact-icon"><ContactIcon type={item.type} /></span>
              <span className="contact-title">{item.title}</span>
              <span className="contact-meta">{item.meta}</span>
              <strong>{item.value}</strong>
            </a>
          ))}
        </div>
        <div className="contact-main">
          <div className="contact-map-widget" aria-label={c.contact.map.title}>
            <div className="map-surface" aria-hidden="true"><span className="map-road map-road-one" /><span className="map-road map-road-two" /></div>
            <div className="map-location">
              <span className="map-pin"><ContactIcon type="pin" /></span>
              <div><strong>{c.contact.map.title}</strong><span>{c.contact.map.address}</span></div>
            </div>
            <a className="map-action" href={c.contact.map.url} target="_blank" rel="noreferrer">{c.contact.map.action}</a>
          </div>
          <aside className="contact-quick">
            <h3>{c.contact.quick.title}</h3>
            <p>{c.contact.quick.text}</p>
            <ul>
              {c.contact.quick.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <a className="primary-btn" href={mailto}>{c.contact.quick.button}</a>
          </aside>
        </div>
      </section>
    </div>
  );
}

function PaymentForm({ ctx, lang }) {
  const t = i18n[lang].payment;
  const invitation = ctx.invitation || {};
  const paymentsEnabled = ctx.config.paymentsEnabled !== false;
  const disabled = !paymentsEnabled || !invitation.id || ["cancelled", "paid"].includes(invitation.status);
  const resident = money(invitation.residentAmount ?? ctx.config.pricing.residentKztAmount, invitation.residentCurrency || "KZT", lang);
  const nonResident = money(invitation.nonResidentAmount ?? ctx.config.pricing.nonResidentAmount, invitation.nonResidentCurrency || "USD", lang);
  const hasCustomPrice = Number.isFinite(Number(invitation.customAmount)) && Number(invitation.customAmount) > 0;
  const customPrice = hasCustomPrice ? money(invitation.customAmount, invitation.customCurrency || "KZT", lang) : "";
  const [status, setStatus] = useState("");
  const [residency, setResidency] = useState("resident_kz");
  useInvitationOpened(ctx.invitation);

  async function submit(event) {
    event.preventDefault();
    setStatus("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await apiFetch("/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(localizedErrorMessage(payload, lang, i18n[lang].pay.error));
      return;
    }
    window.location.href = payload.payUrl;
  }

  return (
    <>
      <section className="hero">
        <div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="lead">{t.lead}</p></div>
        {/* The headline is the amount that will actually be charged for the chosen residency. */}
        <div className="price-panel"><span className="price-label">{t.amount}</span><strong>{hasCustomPrice ? customPrice : residency === "non_resident" ? nonResident : resident}</strong><small>{hasCustomPrice ? t.individualPrice : residency === "non_resident" ? resident : nonResident}</small></div>
      </section>
      <section className="content-grid">
        <form id="payment-form" className="panel form-panel" onSubmit={submit}>
          <h2>{t.authorDetails}</h2>
          {disabled && <p className="status-text danger-text">{paymentsEnabled ? t.invitationRequired : availabilityI18n[lang].message}</p>}
          <input type="hidden" name="invitationId" value={invitation.id || ""} />
          <input type="hidden" name="lang" value={lang} />
          <label>{t.fullName}<input name="fullName" defaultValue={invitation.fullName || ""} required minLength="3" disabled={disabled} /></label>
          <label>{t.email}<input name="email" type="email" defaultValue={invitation.email || ""} required disabled={disabled} /></label>
          <label>{t.phone}<input name="phone" defaultValue={invitation.phone || ""} required minLength="6" disabled={disabled} /></label>
          <label>{t.articleTitle}<textarea name="articleTitle" defaultValue={invitation.articleTitle || ""} readOnly={Boolean(invitation.id)} required disabled={disabled} /></label>
          <fieldset className="field-group">
            <legend>{t.residency}</legend>
            <label className="radio-line"><input type="radio" name="residency" value="resident_kz" defaultChecked disabled={disabled} onChange={(e) => setResidency(e.currentTarget.value)} /><span>{t.resident}{hasCustomPrice ? "" : ` - ${resident}`}</span></label>
            <label className="radio-line"><input type="radio" name="residency" value="non_resident" disabled={disabled} onChange={(e) => setResidency(e.currentTarget.value)} /><span>{t.nonResident}{hasCustomPrice ? "" : ` - ${nonResident}`}</span></label>
          </fieldset>
          <label className="checkline"><input type="checkbox" required disabled={disabled} /><span>{t.agreement}</span></label>
          <button className="primary-btn form-submit" type="submit" disabled={disabled}>{t.submit}</button>
          <p className="status-text">{status}</p>
        </form>
        <aside className="panel quiet process-panel"><h2>{t.processTitle}</h2><ol className="steps">{t.steps.map((step) => <li key={step}>{step}</li>)}</ol></aside>
      </section>
    </>
  );
}

function PayPage({ ctx, lang }) {
  const t = i18n[lang].pay;
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("idle");
  const paymentInFlight = useRef(false);
  const autoStarted = useRef(false);
  const paymentsEnabled = ctx.config.paymentsEnabled !== false;
  async function openPayment() {
    if (paymentInFlight.current) return;
    paymentInFlight.current = true;
    setPhase("loading");
    setStatus("");
    try {
      const response = await apiFetch(`/payments/${encodeURIComponent(ctx.order.id)}/payment-object`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(localizedErrorMessage(payload, lang, t.error));
      if (!payload.paymentObject) throw new Error(t.error);
      await loadHalykPaymentApi(ctx.config.halykPaymentJsUrl);
      window.halyk.pay(payload.paymentObject);
      setPhase("idle");
    } catch (error) {
      setPhase("error");
      setStatus(error instanceof Error && error.message ? error.message : t.error);
    } finally {
      paymentInFlight.current = false;
    }
  }
  useEffect(() => {
    if (!paymentsEnabled || autoStarted.current) return undefined;
    autoStarted.current = true;
    const id = setTimeout(openPayment, 500);
    return () => clearTimeout(id);
  }, [paymentsEnabled, ctx.order?.id]);
  if (!paymentsEnabled) {
    return <section className="center-panel"><div className="panel danger"><h1>{availabilityI18n[lang].title}</h1><p>{availabilityI18n[lang].message}</p></div></section>;
  }
  const returnHref = ctx.order?.invitationId
    ? `/?invite=${encodeURIComponent(ctx.order.invitationId)}&lang=${lang}`
    : `/?lang=${lang}`;
  const loading = phase === "loading";
  return (
    <section className="payment-launch">
      <div className="panel payment-launch-card">
        <div className="payment-launch-heading">
          <span className="payment-shield" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.8 8.7 7 10 4.2-1.3 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          <div><p className="eyebrow">Halyk ePay</p><h1>{t.title}</h1><p className="payment-launch-lead">{t.lead}</p></div>
        </div>
        <dl className="payment-order-summary">
          <div><dt>{t.amount}</dt><dd className="payment-order-amount">{money(ctx.order?.amount, ctx.order?.currency, lang)}</dd></div>
          <div><dt>{t.order}</dt><dd>{ctx.order?.invoiceId}</dd></div>
          <div className="payment-order-article"><dt>{t.article}</dt><dd>{ctx.order?.articleTitle}</dd></div>
        </dl>
        <p className="payment-security"><span aria-hidden="true">✓</span>{t.security}</p>
        {status && <div className="payment-error" role="alert"><strong>{status}</strong></div>}
        <div className="payment-launch-actions">
          <button className="primary-btn" type="button" onClick={openPayment} disabled={loading}>
            {loading && <span className="button-spinner" aria-hidden="true" />}
            {loading ? t.loading : phase === "error" ? t.retry : t.button}
          </button>
          <a className="secondary-btn" href={returnHref}>{t.back}</a>
        </div>
      </div>
    </section>
  );
}

function ResultPage({ ctx, lang, onRefresh }) {
  const t = i18n[lang].result;
  const [checking, setChecking] = useState(false);
  const status = ctx.order?.status || "";
  const paid = status === "paid";
  // A refund follows a successful payment, so it gets its own message instead of "payment failed".
  const refunded = status === "refunded";
  const failed = !ctx.order || ["failed", "postlink_rejected", "cancelled"].includes(status);
  const pending = !paid && !failed && !refunded;
  const paymentsEnabled = ctx.config.paymentsEnabled !== false;
  const href = ctx.order?.invitationId ? `/?invite=${encodeURIComponent(ctx.order.invitationId)}&lang=${lang}` : `/?lang=${lang}`;
  useEffect(() => {
    if (!paymentsEnabled || !ctx.order?.id || !pending) return;
    let active = true;
    setChecking(true);
    apiFetch(`/payments/${encodeURIComponent(ctx.order.id)}/reconcile`, { method: "POST" })
      .then(() => active && onRefresh?.())
      .catch(() => {})
      .finally(() => active && setChecking(false));
    return () => { active = false; };
  }, [ctx.order?.id, paymentsEnabled]);
  const title = paid ? t.ok : refunded ? t.refunded : failed ? t.fail : t.pending;
  const receipt = receiptI18n[lang] || receiptI18n.ru;
  return <section className="center-panel"><div className={`panel ${paid ? "success" : failed ? "danger" : "quiet"}`}><h1>{title}</h1>{ctx.order && <p className="muted">{ctx.order.invoiceId}<br />{ctx.order.articleTitle}</p>}{refunded && <p className="muted">{t.refundedHelp}</p>}{pending && <p className="status-text" role="status">{!paymentsEnabled ? availabilityI18n[lang].message : checking ? t.checking : t.pendingHelp}</p>}{paid && <p className="muted">{receipt.sent}</p>}<div className="result-actions">{paid && <a className="primary-btn" href={`${apiBaseUrl}/payments/${encodeURIComponent(ctx.order.id)}/receipt.pdf`} download>{receipt.download}</a>}<a className="secondary-btn" href={href}>{t.back}</a></div></div></section>;
}

const pageLoaderText = { ru: "Загружаем страницу…", kk: "Бет жүктелуде…", en: "Loading page…" };

// Same markup as the static preloader in index.html, so the handoff to React is seamless.
function PageLoader({ lang }) {
  return (
    <div className="app-loader" role="status" aria-live="polite">
      <div className="app-loader-mark" aria-hidden="true"><span className="app-loader-ring" /><span className="app-loader-logo">CM</span></div>
      <p className="app-loader-brand">ClinMedKaz <span>Pay</span></p>
      <div className="app-loader-bar" aria-hidden="true"><span /></div>
      <p className="app-loader-text">{pageLoaderText[lang] || pageLoaderText.ru}</p>
    </div>
  );
}

function AdminLogin({ lang, onNavigate }) {
  const t = i18n[lang].admin;
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!String(body.username || "").trim() || !String(body.password || "").trim()) {
      setStatus(t.loginRequired);
      return;
    }
    setStatus("");
    setSubmitting(true);
    try {
      const response = await apiFetch("/auth/local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: body.username, password: body.password }),
      });
      if (response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (!payload.jwt) {
          setStatus(t.authError);
          return;
        }
        setAdminJwt(payload.jwt, body.remember === "on");
        const session = await apiFetch("/admin/session");
        if (session.ok) {
          onNavigate("/admin/create");
        } else if (session.status === 403) {
          clearAdminJwt();
          setStatus(t.noAccess);
        } else {
          clearAdminJwt();
          setStatus(t.sessionExpired);
        }
      } else if (response.status === 400 || response.status === 401) {
        setStatus(t.invalidCredentials);
      } else {
        setStatus(t.authError);
      }
    } catch {
      setStatus(t.authError);
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <section className="center-panel">
      <form className="panel login-panel" onSubmit={submit} noValidate>
        <h1>{t.loginTitle}</h1>
        <p className="login-lead">{t.loginLead}</p>
        <label>{t.username}<input name="username" autoComplete="username" disabled={submitting} /></label>
        <label>{t.password}<input name="password" type="password" autoComplete="current-password" disabled={submitting} /></label>
        <label className="checkline login-remember"><input name="remember" type="checkbox" disabled={submitting} /><span>{t.rememberMe}</span></label>
        <button className="primary-btn" disabled={submitting}>{submitting && <span className="button-spinner" aria-hidden="true" />}{t.signIn}</button>
        {status && <p className="status-text danger-text login-alert" role="alert">{status}</p>}
      </form>
    </section>
  );
}

function AdminCreatePage({ lang, onCreated, paymentsEnabled, pricing }) {
  const t = i18n[lang].admin;
  const ui = adminUiI18n[lang] || adminUiI18n.ru;
  const [status, setStatus] = useState("");
  const [createdLink, setCreatedLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("");
    setCreatedLink("");
    setSubmitting(true);
    try {
      const raw = Object.fromEntries(new FormData(form).entries());
      const phone = String(raw.phone || "").replace(/\D/g, "");
      const requestBody = { ...raw, phone, sendEmail: raw.sendEmail === "on" };
      delete requestBody.useCustomPrice;
      if (!useCustomPrice) {
        delete requestBody.customAmount;
        delete requestBody.customCurrency;
      }
      const response = await apiFetch("/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestBody) });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) { clearAdminJwt(); onCreated("auth"); return; }
      if (response.ok) {
        setCreatedLink(payload.link);
        setStatus(payload.duplicateWarning || "createdLink");
        form.reset();
        setUseCustomPrice(false);
        onCreated();
        return;
      }
      setStatus(response.status === 403 ? t.noAccess : localizedErrorMessage(payload, lang, t.loadError));
    } finally {
      setSubmitting(false);
    }
  }
  const statusText = status === "createdLink" ? t.createdLink : ui.warnings[status] || status;
  return (
    <form className="panel admin-form" onSubmit={create} aria-busy={submitting}>
      <div className="section-heading"><h2>{t.create}</h2><p>{t.createLead}</p></div>
      {!paymentsEnabled && <p className="availability-inline" role="status">{availabilityI18n[lang].admin}</p>}
      <p className="form-field-legend"><span className="field-required" aria-hidden="true">*</span> {ui.required}</p>
      <fieldset className="admin-form-grid" disabled={submitting || !paymentsEnabled}>
        <label><AdminFieldLabel lang={lang}>{t.email}</AdminFieldLabel><input name="email" type="email" autoComplete="email" required /></label>
        <label><AdminFieldLabel lang={lang} optional>{t.fullName}</AdminFieldLabel><input name="fullName" autoComplete="name" /></label>
        <label>
          <AdminFieldLabel lang={lang} optional>{t.phone}</AdminFieldLabel>
          <input
            name="phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="tel"
            aria-describedby="admin-phone-hint"
            onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, ""); }}
          />
          <span className="field-hint" id="admin-phone-hint">{ui.digitsOnly}</span>
        </label>
        <label><AdminFieldLabel lang={lang} optional={!useCustomPrice}>{t.country}</AdminFieldLabel><input name="country" autoComplete="country-name" required={useCustomPrice} /></label>
        <label><AdminFieldLabel lang={lang}>{t.lang}</AdminFieldLabel><select name="lang" defaultValue={lang} required><option value="ru">Русский</option><option value="kk">Қазақша</option><option value="en">English</option></select></label>
        <label className="admin-form-wide"><AdminFieldLabel lang={lang}>{t.article}</AdminFieldLabel><textarea name="articleTitle" required /></label>
        <div className="admin-form-wide custom-price-block">
          <label className="checkline custom-price-toggle"><input name="useCustomPrice" type="checkbox" checked={useCustomPrice} onChange={(event) => setUseCustomPrice(event.target.checked)} /><span>{t.customPrice}</span></label>
          {useCustomPrice && (
            <div className="custom-price-fields">
              <label><AdminFieldLabel lang={lang}>{t.customPriceAmount}</AdminFieldLabel><input name="customAmount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder={String(pricing?.residentKztAmount || "")} required /></label>
              <label><AdminFieldLabel lang={lang}>{t.customPriceCurrency}</AdminFieldLabel><select name="customCurrency" defaultValue="KZT" required><option value="KZT">KZT</option><option value="USD">USD</option></select></label>
              <p className="field-hint custom-price-hint">{t.customPriceHint}</p>
            </div>
          )}
        </div>
      </fieldset>
      <label className="checkline"><input name="sendEmail" type="checkbox" defaultChecked disabled={submitting || !paymentsEnabled} /><span>{t.sendEmail}</span></label>
      <div className="form-actions">
        <button className="primary-btn" disabled={submitting || !paymentsEnabled} aria-busy={submitting}>
          {submitting && <span className="btn-spinner" aria-hidden="true" />}
          {submitting ? t.creating : t.create}
        </button>
        {createdLink && <a className="secondary-btn" href={createdLink} target="_blank" rel="noreferrer">{t.open}</a>}
      </div>
      {createdLink && <p className="created-link"><span>{t.createdLink}</span><a href={createdLink} target="_blank" rel="noreferrer">{createdLink}</a></p>}
      <p className="status-text">{statusText}</p>
    </form>
  );
}

function AdminPricingPage({ lang, pricing, onSaved, onAuthLost }) {
  const t = i18n[lang].admin;
  const p = adminPricingI18n[lang] || adminPricingI18n.ru;
  const ui = adminUiI18n[lang] || adminUiI18n.ru;
  const [baseCurrency, setBaseCurrency] = useState("KZT");
  const [amount, setAmount] = useState("");
  const [rateMode, setRateMode] = useState("manual");
  const [manualRate, setManualRate] = useState("");
  const [official, setOfficial] = useState(null);
  const [officialState, setOfficialState] = useState("idle");
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // The form mirrors the loaded pricing; /admin/orders resolves after the first render.
  useEffect(() => {
    if (!pricing) return;
    setBaseCurrency(pricing.baseCurrency || "KZT");
    setAmount(String(pricing.baseAmount ?? pricing.residentKztAmount ?? ""));
    setRateMode(pricing.rateMode || "manual");
    setManualRate(String(pricing.usdToKztRate ?? ""));
    if (pricing.rateMode === "auto" && pricing.usdToKztRate) setOfficial({ rate: pricing.usdToKztRate, date: pricing.rateDate });
  }, [pricing?.baseCurrency, pricing?.baseAmount, pricing?.rateMode, pricing?.usdToKztRate, pricing?.rateDate]);

  // Switching to the automatic rate shows today's National Bank rate before saving.
  useEffect(() => {
    if (rateMode !== "auto" || official) return;
    let active = true;
    setOfficialState("loading");
    apiFetch("/admin/exchange-rate")
      .then(async (response) => {
        if (response.status === 401) { clearAdminJwt(); onAuthLost(); return; }
        const payload = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.ok && payload.exchangeRate?.rate) {
          setOfficial(payload.exchangeRate);
          setOfficialState("idle");
        } else {
          setOfficialState("error");
        }
      })
      .catch(() => active && setOfficialState("error"));
    return () => { active = false; };
  }, [rateMode, official]);

  const rate = rateMode === "auto" ? Number(official?.rate) : Number(manualRate);
  const preview = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(rate) || rate <= 0) return null;
    const kzt = baseCurrency === "KZT" ? Math.round(value) : Math.round(value * rate);
    const usd = baseCurrency === "USD" ? Math.round(value * 100) / 100 : Math.round((kzt / rate) * 100) / 100;
    return { kzt: money(kzt, "KZT", lang), usd: money(usd, "USD", lang) };
  }, [amount, rate, baseCurrency, lang]);

  async function save(event) {
    event.preventDefault();
    setSaved(false);
    if (!preview) {
      setStatus(rateMode === "auto" && officialState === "error" ? p.officialError : p.invalid);
      return;
    }
    setStatus("");
    setSaving(true);
    try {
      const response = await apiFetch("/admin/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseCurrency, baseAmount: Number(amount), rateMode, usdToKztRate: Number(manualRate) || undefined }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) { clearAdminJwt(); onAuthLost(); return; }
      if (response.ok) {
        setSaved(true);
        setStatus(t.pricingSaved);
        if (payload.pricing?.rateMode === "auto") setOfficial({ rate: payload.pricing.usdToKztRate, date: payload.pricing.rateDate });
        onSaved(payload.pricing);
        return;
      }
      setStatus(response.status === 403 ? t.noAccess : localizedErrorMessage(payload, lang, t.loadError));
    } catch {
      setStatus(t.loadError);
    } finally {
      setSaving(false);
    }
  }

  const officialDate = official?.date ? formatDay(official.date, lang) : "";
  // The amount the admin typed leads; the derived currency follows.
  const headline = preview ? (baseCurrency === "USD" ? preview.usd : preview.kzt) : "-";
  const secondary = preview ? (baseCurrency === "USD" ? preview.kzt : preview.usd) : "-";

  return (
    <form className="panel admin-form" onSubmit={save} aria-busy={saving}>
      <div className="section-heading"><h2>{t.pricing}</h2><p>{p.lead}</p></div>
      <p className="form-field-legend"><span className="field-required" aria-hidden="true">*</span> {ui.required}</p>
      <fieldset className="admin-form-grid" disabled={saving || !pricing}>
        <fieldset className="field-group">
          <legend>{p.baseCurrency}</legend>
          <label className="radio-line"><input type="radio" name="baseCurrency" value="KZT" checked={baseCurrency === "KZT"} onChange={() => setBaseCurrency("KZT")} /><span>{p.baseKzt}</span></label>
          <label className="radio-line"><input type="radio" name="baseCurrency" value="USD" checked={baseCurrency === "USD"} onChange={() => setBaseCurrency("USD")} /><span>{p.baseUsd}</span></label>
        </fieldset>
        <fieldset className="field-group">
          <legend>{p.rateMode}</legend>
          <label className="radio-line"><input type="radio" name="rateMode" value="auto" checked={rateMode === "auto"} onChange={() => setRateMode("auto")} /><span>{p.rateAuto}</span></label>
          <label className="radio-line"><input type="radio" name="rateMode" value="manual" checked={rateMode === "manual"} onChange={() => setRateMode("manual")} /><span>{p.rateManual}</span></label>
        </fieldset>
        <label><AdminFieldLabel lang={lang}>{p.priceIn[baseCurrency]}</AdminFieldLabel><input name="baseAmount" type="number" min="1" step={baseCurrency === "KZT" ? "1" : "0.01"} inputMode={baseCurrency === "KZT" ? "numeric" : "decimal"} value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
        {rateMode === "manual" ? (
          <label><AdminFieldLabel lang={lang}>{p.rate}</AdminFieldLabel><input name="usdToKztRate" type="number" min="1" step="0.01" inputMode="decimal" value={manualRate} onChange={(event) => setManualRate(event.target.value)} required /></label>
        ) : (
          <div className="official-rate" role="status">
            <span>{p.official}{officialDate ? ` ${p.officialOn(officialDate)}` : ""}</span>
            {officialState === "loading" && !official ? <small>{p.officialLoading}</small>
              : officialState === "error" && !official ? <small className="danger-text">{p.officialError}</small>
              : <strong>{official ? `${formatNumber(official.rate, lang, { maximumFractionDigits: 2 })} ₸` : "-"}</strong>}
          </div>
        )}
      </fieldset>
      <div className="price-preview">
        <span>{t.pricingPreview}</span>
        <strong>{headline}</strong>
        <small>{secondary}</small>
      </div>
      <p className="landing-note">{rateMode === "auto" ? p.autoNote : t.pricingFrozen}</p>
      <div className="form-actions">
        <button className="primary-btn" disabled={saving || !pricing} aria-busy={saving}>
          {saving && <span className="btn-spinner" aria-hidden="true" />}
          {saving ? t.pricingSaving : t.pricingSave}
        </button>
      </div>
      {pricing && (
        <p className="muted pricing-meta">
          {pricing.source === "db" && pricing.updatedAt
            ? `${t.pricingUpdatedBy}: ${formatDate(pricing.updatedAt, lang)}${pricing.updatedBy ? ` · ${pricing.updatedBy}` : ""}`
            : t.pricingFromEnv}
        </p>
      )}
      <p className={`status-text${saved ? " success-text" : status ? " danger-text" : ""}`} role="status">{status}</p>
    </form>
  );
}

function TransactionsSkeleton({ label }) {
  return (
    <div className="transactions-loading" role="status" aria-live="polite">
      <div className="transactions-loading-label"><span className="transactions-loading-dot" aria-hidden="true" />{label}</div>
      <div className="transaction-list" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div className="transaction-card skeleton-card" key={item} style={{ animationDelay: `${item * 120}ms` }}>
            <div className="skeleton-group"><span className="skeleton skeleton-badge" /><span className="skeleton skeleton-line w-80" /><span className="skeleton skeleton-line sm w-50" /></div>
            <div className="skeleton-group"><span className="skeleton skeleton-line xs w-30" /><span className="skeleton skeleton-line w-70" /><span className="skeleton skeleton-line sm w-60" /></div>
            <div className="skeleton-group"><span className="skeleton skeleton-line xs w-30" /><span className="skeleton skeleton-line w-90" /><span className="skeleton skeleton-line w-70" /></div>
            <div className="skeleton-group skeleton-amount"><span className="skeleton skeleton-line xs w-50" /><span className="skeleton skeleton-line w-80" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Admin endpoints need the bearer token, so the PDF is fetched and handed to the browser as a blob.
async function downloadAdminReceipt(order, lang) {
  try {
    const response = await apiFetch(`/admin/orders/${encodeURIComponent(order.id)}/receipt.pdf`);
    if (!response.ok) throw new Error(String(response.status));
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinmedkaz-receipt-${order.invoiceId || order.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.alert((receiptI18n[lang] || receiptI18n.ru).error);
  }
}

function AdminTransactionsPage({ data, status, lang, onRefresh, syncing, loading, filters, onFiltersChange }) {
  const t = i18n[lang].admin;
  const paginationT = adminPaginationI18n[lang] || adminPaginationI18n.ru;
  const [query, setQuery] = useState(filters.query);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [dateFrom, setDateFrom] = useState(filters.dateFrom);
  const [dateTo, setDateTo] = useState(filters.dateTo);
  const orders = data.orders || [];
  const statuses = useMemo(() => Object.keys(adminUiI18n[lang]?.statuses || adminUiI18n.ru.statuses), [lang]);
  const pagination = data.pagination || { page: 1, pageCount: 1, total: orders.length };

  function applyFilters(event) {
    event.preventDefault();
    onFiltersChange({ ...filters, query: query.trim(), status: statusFilter, dateFrom, dateTo, page: 1 });
  }

  return (
    <section className="panel transactions-panel">
      <div className="table-header">
        <div className="section-heading"><h2>{t.orders}</h2><p>{t.ordersLead}</p></div>
        <button className="secondary-btn" type="button" onClick={onRefresh} disabled={syncing}>{syncing ? adminSyncI18n[lang].syncing : t.refresh}</button>
      </div>
      <form className="admin-toolbar" onSubmit={applyFilters}>
        <div className="admin-toolbar-primary">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={t.status}>
            <option value="all">{t.allStatuses}</option>
            {statuses.map((item) => <option key={item} value={item}>{adminStatusLabel(item, lang)}</option>)}
          </select>
          <button className="secondary-btn" type="submit">{paginationT.search}</button>
        </div>
        <div className="admin-date-filters">
          <label><span>{t.dateFrom}</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label><span>{t.dateTo}</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
        </div>
      </form>
      {status && <p className="status-text danger-text">{status}</p>}
      {loading && orders.length === 0 ? <TransactionsSkeleton label={adminSyncI18n[lang].loading} /> : orders.length === 0 ? <p className="empty-state">{t.emptyOrders}</p> : (
        <div className={`transaction-list${loading ? " is-refreshing" : ""}`} aria-busy={loading}>
          {orders.map((order) => (
            <article className="transaction-card" key={order.id}>
              <div className="transaction-main">
                <span className={`badge badge-${order.status}`}>{adminStatusLabel(order.status, lang)}</span>
                <strong>{order.invoiceId || order.id}</strong>
                <small>{formatDate(order.createdAt, lang)}</small>
                {(order.recordType === "invitation" || (order.openCount > 0 && !["paid", "refunded"].includes(order.status))) && <LinkOpens entry={order} lang={lang} />}
                {order.recordType === "invitation" && <a className="transaction-link" href={localizedPath("/payment", order.lang || lang, `invite=${encodeURIComponent(order.invitationId || order.id)}`)} target="_blank" rel="noreferrer">{t.open}</a>}
                {order.recordType !== "invitation" && order.paymentReceivedAt && <button className="transaction-link" type="button" onClick={() => downloadAdminReceipt(order, lang)}>{(receiptI18n[lang] || receiptI18n.ru).admin} PDF</button>}
              </div>
              <div className="transaction-detail"><span>{t.author}</span><strong>{order.fullName || "-"}</strong><small>{order.email}</small>{order.country && <small>{order.country}</small>}</div>
              <div className="transaction-detail transaction-article"><span>{t.article}</span><strong>{order.articleTitle || "-"}</strong></div>
              <div className="transaction-detail transaction-amount"><span>{t.amount}</span><strong>{money(order.amount, order.currency, lang)}</strong></div>
            </article>
          ))}
        </div>
      )}
      {!(loading && orders.length === 0) && <div className="admin-pagination-wrap">
        <label className="admin-page-size"><span>{paginationT.perPage}</span><select value={filters.pageSize} onChange={(event) => onFiltersChange({ ...filters, pageSize: Number(event.target.value), page: 1 })}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
        <span className="admin-total">{paginationT.total(pagination.total)}</span>
        <nav className="admin-pagination" aria-label={paginationT.page(pagination.page, pagination.pageCount)}>
          <button className="secondary-btn" type="button" disabled={pagination.page <= 1 || syncing} onClick={() => onFiltersChange({ ...filters, page: pagination.page - 1 })}>{paginationT.previous}</button>
          <span>{paginationT.page(pagination.page, pagination.pageCount)}</span>
          <button className="secondary-btn" type="button" disabled={pagination.page >= pagination.pageCount || syncing} onClick={() => onFiltersChange({ ...filters, page: pagination.page + 1 })}>{paginationT.next}</button>
        </nav>
      </div>}
    </section>
  );
}

function AdminPage({ lang, path, paymentsEnabled, onNavigate }) {
  const t = i18n[lang].admin;
  const [data, setData] = useState({ orders: [], pagination: { page: 1, pageCount: 1, total: 0 }, pricing: null });
  const [filters, setFilters] = useState({ query: "", status: "all", dateFrom: "", dateTo: "", page: 1, pageSize: 20 });
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const view = path === "/admin/transactions" ? "transactions" : path === "/admin/pricing" ? "pricing" : "create";
  const loadSeq = useRef(0);
  async function fetchOrders(nextFilters, isCurrent) {
    try {
      const params = new URLSearchParams({ page: String(nextFilters.page), pageSize: String(nextFilters.pageSize) });
      if (nextFilters.query) params.set("query", nextFilters.query);
      if (nextFilters.status !== "all") params.set("status", nextFilters.status);
      if (nextFilters.dateFrom) params.set("dateFrom", dateFilterBoundary(nextFilters.dateFrom));
      if (nextFilters.dateTo) params.set("dateTo", dateFilterBoundary(nextFilters.dateTo, true));
      const response = await apiFetch(`/admin/orders?${params.toString()}`);
      if (!isCurrent()) return false;
      if (response.status === 401) { clearAdminJwt(); onNavigate("/admin/login"); return false; }
      if (response.status === 403) { setStatus(t.noAccess); return false; }
      if (!response.ok) { setStatus(t.loadError); return false; }
      const payload = await response.json();
      if (!isCurrent()) return false;
      setData(payload);
      setStatus("");
      return true;
    } catch {
      if (isCurrent()) setStatus(t.loadError);
      return false;
    }
  }
  // Saved orders are shown right away; the Halyk reconciliation runs afterwards and quietly
  // refreshes the list. Each call supersedes earlier ones so stale responses never overwrite newer data.
  async function load({ reconcile = paymentsEnabled, nextFilters = filters, silent = false } = {}) {
    const seq = ++loadSeq.current;
    const isCurrent = () => seq === loadSeq.current;
    setSyncing(false);
    setLoading(!silent);
    const loaded = await fetchOrders(nextFilters, isCurrent);
    if (isCurrent()) setLoading(false);
    if (!loaded || !reconcile || !isCurrent()) return;
    setSyncing(true);
    try {
      const syncResponse = await apiFetch("/admin/reconcile", { method: "POST" });
      if (!isCurrent()) return;
      if (syncResponse.status === 401) { clearAdminJwt(); onNavigate("/admin/login"); return; }
      if (syncResponse.status === 403) { setStatus(t.noAccess); return; }
      if (!syncResponse.ok) { setStatus(adminSyncI18n[lang].warning); return; }
      await fetchOrders(nextFilters, isCurrent);
    } catch {
      if (isCurrent()) setStatus(adminSyncI18n[lang].warning);
    } finally {
      if (isCurrent()) setSyncing(false);
    }
  }
  useEffect(() => {
    load();
    if (view !== "transactions") return undefined;
    const timer = window.setInterval(() => load({ silent: true }), 60_000);
    return () => window.clearInterval(timer);
  }, [view, lang, paymentsEnabled, filters.query, filters.status, filters.dateFrom, filters.dateTo, filters.page, filters.pageSize]);

  return (
    <section className="admin-shell">
      <header className="admin-header panel">
        <div><p className="eyebrow">ClinMedKaz Pay</p><h1>{t.title}</h1></div>
        <button className="secondary-btn" type="button" onClick={() => { clearAdminJwt(); markAdminDevice(false); onNavigate("/admin/login"); }}>{t.logout}</button>
      </header>
      <nav className="admin-tabs" aria-label={ariaI18n[lang].adminSections}>
        <a className={view === "create" ? "active" : ""} href={localizedPath("/admin/create", lang)} onClick={(event) => { event.preventDefault(); onNavigate("/admin/create"); }}>{t.create}</a>
        <a className={view === "transactions" ? "active" : ""} href={localizedPath("/admin/transactions", lang)} onClick={(event) => { event.preventDefault(); onNavigate("/admin/transactions"); }}>{t.transactions}</a>
        <a className={view === "pricing" ? "active" : ""} href={localizedPath("/admin/pricing", lang)} onClick={(event) => { event.preventDefault(); onNavigate("/admin/pricing"); }}>{t.pricing}</a>
      </nav>
      {view === "create" && <AdminCreatePage lang={lang} paymentsEnabled={paymentsEnabled} pricing={data.pricing} onCreated={(reason) => reason === "auth" ? onNavigate("/admin/login") : load({ reconcile: false })} />}
      {view === "transactions" && <AdminTransactionsPage data={data} status={status} lang={lang} onRefresh={() => load()} syncing={syncing} loading={loading} filters={filters} onFiltersChange={setFilters} />}
      {view === "pricing" && (
        <AdminPricingPage
          lang={lang}
          pricing={data.pricing}
          onSaved={(pricing) => setData((current) => ({ ...current, pricing }))}
          onAuthLost={() => onNavigate("/admin/login")}
        />
      )}
    </section>
  );
}

const updatedLabel = { ru: "Обновлено", kk: "Жаңартылды", en: "Last updated" };

function LegalPage({ ctx, lang, kind }) {
  const { content, updated } = getLegalContent(lang, ctx.config);
  const doc = content[kind] || content.service;
  return (
    <section className="doc-page panel">
      <h1>{doc.title}</h1>
      {doc.blocks.map((block, index) => {
        if (block.note) return <p className="doc-note" key={index}>{block.note}</p>;
        if (block.h) return <h2 key={index}>{block.h}</h2>;
        if (block.p) return <p key={index}>{block.p}</p>;
        if (block.list) return <ul key={index}>{block.list.map((item, i) => <li key={i}>{item}</li>)}</ul>;
        if (block.requisites) return (
          <dl className="requisites" key={index}>
            {block.requisites.map(([label, value], i) => (
              <div className="requisite-row" key={i}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        );
        return null;
      })}
      <p className="doc-updated muted">{updatedLabel[lang] || updatedLabel.ru}: {updated}</p>
    </section>
  );
}

function App() {
  const [location, setLocation] = useState(() => ({ path: window.location.pathname, search: window.location.search }));
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState("");
  const requestedLang = useMemo(() => {
    const value = new URLSearchParams(location.search).get("lang");
    return supportedLanguages.includes(value) ? value : "ru";
  }, [location.search]);

  function navigate(path, options = {}) {
    const nextLang = options.lang || (supportedLanguages.includes(ctx?.lang) ? ctx.lang : requestedLang);
    const params = new URLSearchParams(options.preserveSearch ? location.search : "");
    params.set("lang", nextLang);
    const search = `?${params.toString()}`;
    const url = `${path}${search}`;
    window.history.pushState({}, "", url);
    setLocation({ path, search });
  }

  function changeLang(nextLang) {
    const params = new URLSearchParams(location.search);
    params.set("lang", nextLang);
    const search = `?${params.toString()}`;
    window.history.pushState({}, "", `${location.path}${search}`);
    setLocation({ path: location.path, search });
  }

  useEffect(() => {
    function syncLocation() {
      setLocation({ path: window.location.pathname, search: window.location.search });
    }
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  function loadContext() {
    const params = new URLSearchParams(location.search);
    params.set("path", location.path);
    setError("");
    return apiFetch(`/public/context?${params.toString()}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load page")))
      .then(setCtx)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadContext();
  }, [location]);
  const lang = useMemo(() => supportedLanguages.includes(ctx?.lang) ? ctx.lang : requestedLang, [ctx, requestedLang]);
  if (error) return <main className="center-panel"><div className="panel danger"><h1>{error}</h1></div></main>;
  if (!ctx) return <PageLoader lang={requestedLang} />;
  const path = location.path;
  let page;
  if (path === "/") page = ctx.invitation ? <PaymentForm ctx={ctx} lang={lang} /> : <Landing ctx={ctx} lang={lang} onNavigate={navigate} />;
  else if (path === "/payment") page = <PaymentForm ctx={ctx} lang={lang} />;
  else if (path.startsWith("/pay/")) {
    const closedStatuses = ["failed", "postlink_rejected", "cancelled", "refunded"];
    if (!ctx.order || closedStatuses.includes(ctx.order.status)) page = <ResultPage ctx={ctx} lang={lang} onRefresh={loadContext} />;
    else if (ctx.order.status === "paid") page = <ResultPage ctx={ctx} lang={lang} onRefresh={loadContext} />;
    else page = <PayPage ctx={ctx} lang={lang} />;
  }
  else if (path.startsWith("/payment/success/")) page = <ResultPage ctx={ctx} lang={lang} onRefresh={loadContext} />;
  else if (path.startsWith("/payment/failure/")) page = <ResultPage ctx={ctx} lang={lang} onRefresh={loadContext} />;
  else if (path === "/admin/login") page = <AdminLogin lang={lang} onNavigate={navigate} />;
  else if (["/admin", "/admin/create", "/admin/transactions", "/admin/pricing"].includes(path)) page = adminJwt() ? <AdminPage lang={lang} path={path} paymentsEnabled={ctx.config.paymentsEnabled !== false} onNavigate={navigate} /> : <AdminLogin lang={lang} onNavigate={navigate} />;
  else page = <LegalPage ctx={ctx} lang={lang} kind={path.slice(1)} />;
  return <><Nav lang={lang} path={path} search={location.search} paymentsEnabled={ctx.config.paymentsEnabled !== false} onNavigate={navigate} onChangeLang={changeLang} /><main>{page}</main><Footer ctx={ctx} lang={lang} onNavigate={navigate} /></>;
}

createRoot(document.getElementById("app")).render(<App />);
