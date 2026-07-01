import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { getLegalContent } from "./legal";
import { getLandingContent } from "./landing";

const supportedLanguages = ["ru", "kk", "en"];
const defaultApiBaseUrl = import.meta.env.PROD ? "https://clinmedkazserver.nnmc.kz/api" : "/api";
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");
const adminJwtStorageKey = "clinmed_admin_jwt";

function adminJwt() {
  return sessionStorage.getItem(adminJwtStorageKey) || "";
}

function setAdminJwt(jwt) {
  sessionStorage.setItem(adminJwtStorageKey, jwt);
}

function clearAdminJwt() {
  sessionStorage.removeItem(adminJwtStorageKey);
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
    pay: { title: "Открываем Halyk ePay", button: "Открыть форму оплаты", token: "Запрашиваем платежный токен...", error: "Не удалось начать оплату." },
    result: { ok: "Оплата получена", fail: "Оплата не прошла", back: "Вернуться к форме оплаты" },
    admin: { title: "Администрирование оплат", login: "Вход в панель управления", loginTitle: "Панель управления оплатами", loginLead: "Авторизуйтесь, чтобы создавать платежные ссылки и просматривать транзакции.", username: "Логин", password: "Пароль", signIn: "Войти", logout: "Выйти", create: "Создать ссылку", createLead: "Заполните данные автора, выберите язык письма и отправьте персональную ссылку на оплату.", orders: "История транзакций", ordersLead: "Отслеживайте статусы оплат, автора и сумму без отвлечения на форму создания ссылки.", refresh: "Обновить", noAccess: "У этой учетной записи нет доступа к управлению оплатами.", sessionExpired: "Сессия истекла. Войдите снова.", invalidCredentials: "Неверный логин или пароль.", loginRequired: "Введите логин и пароль.", authError: "Не удалось выполнить вход. Проверьте данные и повторите попытку.", loadError: "Не удалось загрузить панель управления.", email: "Email", fullName: "ФИО", phone: "Телефон", article: "Статья", lang: "Язык", sendEmail: "Отправить ссылку на Email", createdLink: "Ссылка создана", status: "Статус", invoice: "Инвойс", author: "Автор", amount: "Сумма", createdAt: "Создано", search: "Поиск по автору, email, статье или инвойсу", allStatuses: "Все статусы", emptyOrders: "Транзакций пока нет.", open: "Открыть", transactions: "Транзакции" },
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
    pay: { title: "Halyk ePay ашылуда", button: "Төлем формасын ашу", token: "Төлем токені сұралуда...", error: "Төлемді бастау мүмкін болмады." },
    result: { ok: "Төлем қабылданды", fail: "Төлем өтпеді", back: "Төлем формасына оралу" },
    admin: { title: "Төлемдерді басқару", login: "Басқару панеліне кіру", loginTitle: "Төлемдерді басқару панелі", loginLead: "Төлем сілтемелерін жасау және транзакцияларды қарау үшін авторизациядан өтіңіз.", username: "Логин", password: "Құпиясөз", signIn: "Кіру", logout: "Шығу", create: "Сілтеме жасау", createLead: "Автор деректерін енгізіп, хат тілін таңдаңыз және жеке төлем сілтемесін жіберіңіз.", orders: "Транзакциялар тарихы", ordersLead: "Төлем мәртебесін, авторды және соманы сілтеме жасау формасынан бөлек бақылаңыз.", refresh: "Жаңарту", noAccess: "Бұл есептік жазбада төлемдерді басқаруға рұқсат жоқ.", sessionExpired: "Сессия мерзімі аяқталды. Қайта кіріңіз.", invalidCredentials: "Логин немесе құпиясөз дұрыс емес.", loginRequired: "Логин мен құпиясөзді енгізіңіз.", authError: "Кіру мүмкін болмады. Деректерді тексеріп, қайталап көріңіз.", loadError: "Басқару панелін жүктеу мүмкін болмады.", email: "Email", fullName: "Т.А.Ә.", phone: "Телефон", article: "Мақала", lang: "Тіл", sendEmail: "Сілтемені Email арқылы жіберу", createdLink: "Сілтеме жасалды", status: "Мәртебе", invoice: "Инвойс", author: "Автор", amount: "Сома", createdAt: "Жасалды", search: "Автор, email, мақала немесе инвойс бойынша іздеу", allStatuses: "Барлық мәртебелер", emptyOrders: "Транзакциялар әлі жоқ.", open: "Ашу", transactions: "Транзакциялар" },
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
    pay: { title: "Opening Halyk ePay", button: "Open payment form", token: "Requesting payment token...", error: "Could not start payment." },
    result: { ok: "Payment received", fail: "Payment failed", back: "Back to payment form" },
    admin: { title: "Payment administration", login: "Management portal sign in", loginTitle: "Payment management portal", loginLead: "Sign in to create payment links and review transaction history.", username: "Username", password: "Password", signIn: "Sign in", logout: "Logout", create: "Create link", createLead: "Enter author details, choose the email language and send a personal payment link.", orders: "Transaction history", ordersLead: "Track payment status, author and amount separately from the link creation workflow.", refresh: "Refresh", noAccess: "This account does not have access to payment administration.", sessionExpired: "Session expired. Sign in again.", invalidCredentials: "Invalid username or password.", loginRequired: "Enter username and password.", authError: "Could not sign in. Check the details and try again.", loadError: "Could not load the management portal.", email: "Email", fullName: "Full name", phone: "Phone", article: "Article", lang: "Language", sendEmail: "Send link by email", createdLink: "Link created", status: "Status", invoice: "Invoice", author: "Author", amount: "Amount", createdAt: "Created", search: "Search author, email, article or invoice", allStatuses: "All statuses", emptyOrders: "No transactions yet.", open: "Open", transactions: "Transactions" },
    legal: { service: "Service description", terms: "Public offer", privacy: "Privacy policy", refunds: "Refund policy", contacts: "Contacts" },
  },
};

function money(amount, currency) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: currency === "KZT" ? 0 : 2 }).format(Number(amount || 0))} ${currency}`;
}

function localizedPath(path, lang, search = "") {
  const params = new URLSearchParams(search);
  params.set("lang", lang);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function Nav({ lang, path, search, onNavigate, onChangeLang }) {
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
        <button className="menu-toggle" type="button" aria-controls="primary-menu" aria-expanded={menuOpen} aria-label="Menu" onClick={() => setMenuOpen((value) => !value)}><span /><span /><span /></button>
        <div className="nav-links" id="primary-menu">
          {links.map(([base, hash], index) => <a key={index} href={localizedPath(base, lang)} onClick={(event) => go(event, base, hash)}>{t.nav[index]}</a>)}
          <a className="nav-pay-link" href={localizedPath("/payment", lang)} onClick={(event) => go(event, "/payment", "")}>{t.navPayment}</a>
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
        <div className="payment-mark">
          {paymentLogos.map((logo) => (
            <span className={`payment-logo ${logo.className}`} key={logo.name}>
              <img src={`/assets/payments/${logo.name}`} alt={logo.label} />
            </span>
          ))}
        </div>
      </div>
      <nav className="footer-legal" aria-label="Legal">
        {legalLinks.map(([href, label]) => (
          <a key={href} href={localizedPath(href, lang)} onClick={(event) => go(event, href)}>{label}</a>
        ))}
      </nav>
      <div className="footer-copy">© {new Date().getFullYear()} {b.name}. {b.bin ? `БИН ${b.bin}` : ""}</div>
    </footer>
  );
}

function Landing({ ctx, lang, onNavigate }) {
  const c = getLandingContent(lang, ctx.config);
  const mailto = c.cta.email ? `mailto:${c.cta.email}?subject=${encodeURIComponent(c.cta.subject)}` : "#contact";
  const paymentHref = localizedPath("/payment", lang);
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-copy">
            <span className="hero-pill">{c.hero.pill}</span>
            <h1>{c.hero.title} <span className="accent">{c.hero.titleAccent}</span></h1>
            <p className="hero-lead">{c.hero.lead}</p>
            <div className="hero-actions">
              <a className="primary-btn" href={paymentHref} onClick={(event) => { event.preventDefault(); onNavigate("/payment"); }}>{c.hero.primaryCta} <span aria-hidden="true">→</span></a>
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
            <a className="primary-btn hero-card-btn" href={paymentHref} onClick={(event) => { event.preventDefault(); onNavigate("/payment"); }}>{c.hero.card.cta}</a>
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
          <div className="price-badge"><span>{ctx.config.publicationFeeDisplay}</span><small>{money(ctx.config.pricing.residentKztAmount, "KZT")}</small></div>
        </div>
      </section>

      <section className="landing-cta" id="contact">
        <h2>{c.cta.title}</h2>
        <p>{c.cta.text}</p>
        <a className="primary-btn" href={mailto}>{c.cta.button}</a>
        {c.cta.phone && <p className="landing-contact">{c.cta.email} · {c.cta.phone}</p>}
      </section>
    </div>
  );
}

function PaymentForm({ ctx, lang }) {
  const t = i18n[lang].payment;
  const invitation = ctx.invitation || {};
  const disabled = !invitation.id || ["cancelled", "paid"].includes(invitation.status);
  const resident = money(ctx.config.pricing.residentKztAmount, "KZT");
  const nonResident = money(ctx.config.pricing.nonResidentAmount, "USD");
  const [status, setStatus] = useState("");
  const [residency, setResidency] = useState("resident_kz");

  async function submit(event) {
    event.preventDefault();
    setStatus("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await apiFetch("/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error || "Payment could not be created.");
      return;
    }
    window.location.href = payload.payUrl;
  }

  return (
    <>
      <section className="hero">
        <div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p className="lead">{t.lead}</p></div>
        <div className="price-panel"><span className="price-label">{t.amount}</span><strong>{ctx.config.publicationFeeDisplay}</strong><small>{residency === "non_resident" ? nonResident : resident}</small></div>
      </section>
      <section className="content-grid">
        <form id="payment-form" className="panel form-panel" onSubmit={submit}>
          <h2>{t.authorDetails}</h2>
          {disabled && <p className="status-text danger-text">{t.invitationRequired}</p>}
          <input type="hidden" name="invitationId" value={invitation.id || ""} />
          <input type="hidden" name="lang" value={lang} />
          <label>{t.fullName}<input name="fullName" defaultValue={invitation.fullName || ""} required minLength="3" disabled={disabled} /></label>
          <label>{t.email}<input name="email" type="email" defaultValue={invitation.email || ""} required disabled={disabled} /></label>
          <label>{t.phone}<input name="phone" defaultValue={invitation.phone || ""} required minLength="6" disabled={disabled} /></label>
          <label>{t.articleTitle}<textarea name="articleTitle" defaultValue={invitation.articleTitle || ""} readOnly={Boolean(invitation.id)} required disabled={disabled} /></label>
          <fieldset className="field-group">
            <legend>{t.residency}</legend>
            <label className="radio-line"><input type="radio" name="residency" value="resident_kz" defaultChecked disabled={disabled} onChange={(e) => setResidency(e.currentTarget.value)} /><span>{t.resident} - {resident}</span></label>
            <label className="radio-line"><input type="radio" name="residency" value="non_resident" disabled={disabled} onChange={(e) => setResidency(e.currentTarget.value)} /><span>{t.nonResident} - {nonResident}</span></label>
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
  async function openPayment() {
    setStatus(t.token);
    const response = await apiFetch(`/payments/${encodeURIComponent(ctx.order.id)}/payment-object`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error || t.error);
      return;
    }
    if (!window.halyk?.pay) {
      const script = document.createElement("script");
      script.src = ctx.config.halykPaymentJsUrl;
      script.onload = () => window.halyk?.pay(payload.paymentObject);
      script.onerror = () => setStatus(t.error);
      document.head.append(script);
      return;
    }
    window.halyk.pay(payload.paymentObject);
  }
  useEffect(() => { const id = setTimeout(openPayment, 350); return () => clearTimeout(id); }, []);
  return <section className="center-panel"><div className="panel"><p className="eyebrow">{ctx.order?.invoiceId}</p><h1>{t.title}</h1><button className="primary-btn" onClick={openPayment}>{t.button}</button><p className="status-text">{status}</p></div></section>;
}

function ResultPage({ ctx, lang, ok }) {
  const t = i18n[lang].result;
  const href = ctx.order?.invitationId ? `/?invite=${encodeURIComponent(ctx.order.invitationId)}&lang=${lang}` : `/?lang=${lang}`;
  return <section className="center-panel"><div className={`panel ${ok ? "success" : "danger"}`}><h1>{ok ? t.ok : t.fail}</h1>{ctx.order && <p className="muted">{ctx.order.invoiceId}<br />{ctx.order.articleTitle}</p>}<a className="secondary-btn" href={href}>{t.back}</a></div></section>;
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
        setAdminJwt(payload.jwt);
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
        <button className="primary-btn" disabled={submitting}>{t.signIn}</button>
        {status && <p className="status-text danger-text login-alert" role="alert">{status}</p>}
      </form>
    </section>
  );
}

function AdminCreatePage({ lang, onCreated }) {
  const t = i18n[lang].admin;
  const [status, setStatus] = useState("");
  const [createdLink, setCreatedLink] = useState("");
  async function create(event) {
    event.preventDefault();
    setStatus("");
    setCreatedLink("");
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await apiFetch("/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...raw, sendEmail: raw.sendEmail === "on" }) });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) { clearAdminJwt(); onCreated("auth"); return; }
    if (response.ok) {
      setCreatedLink(payload.link);
      setStatus(payload.duplicateWarning ? payload.duplicateWarning : t.createdLink);
      event.currentTarget.reset();
      onCreated();
      return;
    }
    setStatus(response.status === 403 ? t.noAccess : payload.error || t.loadError);
  }
  return (
    <form className="panel admin-form" onSubmit={create}>
      <div className="section-heading"><h2>{t.create}</h2><p>{t.createLead}</p></div>
      <div className="admin-form-grid">
        <label>{t.email}<input name="email" type="email" autoComplete="email" required /></label>
        <label>{t.fullName}<input name="fullName" autoComplete="name" /></label>
        <label>{t.phone}<input name="phone" autoComplete="tel" /></label>
        <label>{t.lang}<select name="lang" defaultValue={lang}><option value="ru">Русский</option><option value="kk">Қазақша</option><option value="en">English</option></select></label>
        <label className="admin-form-wide">{t.article}<textarea name="articleTitle" required /></label>
      </div>
      <label className="checkline"><input name="sendEmail" type="checkbox" defaultChecked /><span>{t.sendEmail}</span></label>
      <div className="form-actions"><button className="primary-btn">{t.create}</button>{createdLink && <a className="secondary-btn" href={createdLink} target="_blank" rel="noreferrer">{t.open}</a>}</div>
      {createdLink && <p className="created-link"><span>{t.createdLink}</span><a href={createdLink} target="_blank" rel="noreferrer">{createdLink}</a></p>}
      <p className="status-text">{status}</p>
    </form>
  );
}

function AdminTransactionsPage({ data, status, lang, onRefresh }) {
  const t = i18n[lang].admin;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const orders = data.orders || [];
  const statuses = useMemo(() => Array.from(new Set(orders.map((order) => order.status).filter(Boolean))).sort(), [orders]);
  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const haystack = [order.invoiceId, order.fullName, order.email, order.articleTitle, order.amount, order.currency].join(" ").toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [orders, query, statusFilter]);

  return (
    <section className="panel transactions-panel">
      <div className="table-header">
        <div className="section-heading"><h2>{t.orders}</h2><p>{t.ordersLead}</p></div>
        <button className="secondary-btn" type="button" onClick={onRefresh}>{t.refresh}</button>
      </div>
      <div className="admin-toolbar">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">{t.allStatuses}</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      {status && <p className="status-text danger-text">{status}</p>}
      {filteredOrders.length === 0 ? <p className="empty-state">{t.emptyOrders}</p> : (
        <div className="transaction-list">
          {filteredOrders.map((order) => (
            <article className="transaction-card" key={order.id}>
              <div className="transaction-main">
                <span className={`badge badge-${order.status}`}>{order.status}</span>
                <strong>{order.invoiceId || order.id}</strong>
                <small>{formatDate(order.createdAt)}</small>
              </div>
              <div className="transaction-detail"><span>{t.author}</span><strong>{order.fullName || "-"}</strong><small>{order.email}</small></div>
              <div className="transaction-detail transaction-article"><span>{t.article}</span><strong>{order.articleTitle || "-"}</strong></div>
              <div className="transaction-detail transaction-amount"><span>{t.amount}</span><strong>{order.amount} {order.currency}</strong></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminPage({ lang, path, onNavigate }) {
  const t = i18n[lang].admin;
  const [data, setData] = useState({ orders: [], invitations: [] });
  const [status, setStatus] = useState("");
  const view = path === "/admin/transactions" ? "transactions" : "create";
  async function load() {
    try {
      const response = await apiFetch("/admin/orders");
      if (response.status === 401) { clearAdminJwt(); onNavigate("/admin/login"); return; }
      if (response.status === 403) { setStatus(t.noAccess); return; }
      if (!response.ok) { setStatus(t.loadError); return; }
      setStatus("");
      setData(await response.json());
    } catch {
      setStatus(t.loadError);
    }
  }
  useEffect(() => { load(); }, []);

  return (
    <section className="admin-shell">
      <header className="admin-header panel">
        <div><p className="eyebrow">ClinMedKaz Pay</p><h1>{t.title}</h1></div>
        <button className="secondary-btn" type="button" onClick={() => { clearAdminJwt(); onNavigate("/admin/login"); }}>{t.logout}</button>
      </header>
      <nav className="admin-tabs" aria-label="Admin sections">
        <a className={view === "create" ? "active" : ""} href={localizedPath("/admin/create", lang)} onClick={(event) => { event.preventDefault(); onNavigate("/admin/create"); }}>{t.create}</a>
        <a className={view === "transactions" ? "active" : ""} href={localizedPath("/admin/transactions", lang)} onClick={(event) => { event.preventDefault(); onNavigate("/admin/transactions"); }}>{t.transactions}</a>
      </nav>
      {view === "create"
        ? <AdminCreatePage lang={lang} onCreated={(reason) => reason === "auth" ? onNavigate("/admin/login") : load()} />
        : <AdminTransactionsPage data={data} status={status} lang={lang} onRefresh={load} />}
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set("path", location.path);
    setError("");
    apiFetch(`/public/context?${params.toString()}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load page")))
      .then(setCtx)
      .catch((err) => setError(err.message));
  }, [location]);
  const lang = useMemo(() => supportedLanguages.includes(ctx?.lang) ? ctx.lang : requestedLang, [ctx, requestedLang]);
  if (error) return <main className="center-panel"><div className="panel danger"><h1>{error}</h1></div></main>;
  if (!ctx) return <main className="center-panel"><div className="panel">Loading...</div></main>;
  const path = location.path;
  let page;
  if (path === "/") page = ctx.invitation ? <PaymentForm ctx={ctx} lang={lang} /> : <Landing ctx={ctx} lang={lang} onNavigate={navigate} />;
  else if (path === "/payment") page = <PaymentForm ctx={ctx} lang={lang} />;
  else if (path.startsWith("/pay/")) {
    const closedStatuses = ["failed", "postlink_rejected", "cancelled", "refunded"];
    if (!ctx.order || closedStatuses.includes(ctx.order.status)) page = <ResultPage ctx={ctx} lang={lang} ok={false} />;
    else if (ctx.order.status === "paid") page = <ResultPage ctx={ctx} lang={lang} ok />;
    else page = <PayPage ctx={ctx} lang={lang} />;
  }
  else if (path.startsWith("/payment/success/")) page = <ResultPage ctx={ctx} lang={lang} ok />;
  else if (path.startsWith("/payment/failure/")) page = <ResultPage ctx={ctx} lang={lang} ok={false} />;
  else if (path === "/admin/login") page = <AdminLogin lang={lang} onNavigate={navigate} />;
  else if (path === "/admin" || path === "/admin/create" || path === "/admin/transactions") page = adminJwt() ? <AdminPage lang={lang} path={path} onNavigate={navigate} /> : <AdminLogin lang={lang} onNavigate={navigate} />;
  else page = <LegalPage ctx={ctx} lang={lang} kind={path.slice(1)} />;
  return <><Nav lang={lang} path={path} search={location.search} onNavigate={navigate} onChangeLang={changeLang} /><main>{page}</main><Footer ctx={ctx} lang={lang} onNavigate={navigate} /></>;
}

createRoot(document.getElementById("app")).render(<App />);
