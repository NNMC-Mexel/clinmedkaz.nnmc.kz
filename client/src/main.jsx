import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const supportedLanguages = ["ru", "kk", "en"];

const i18n = {
  ru: {
    nav: ["Главная", "Услуга", "Оферта", "Конфиденциальность", "Возвраты", "Контакты"],
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
    admin: { title: "Администрирование оплат", login: "Вход в админку", username: "Логин", password: "Пароль", signIn: "Войти", logout: "Выйти", create: "Создать ссылку", orders: "Транзакции", refresh: "Обновить" },
    legal: { service: "Описание услуги", terms: "Публичная оферта", privacy: "Политика конфиденциальности", refunds: "Правила возврата", contacts: "Контакты" },
  },
  kk: {
    nav: ["Басты бет", "Қызмет", "Оферта", "Құпиялылық", "Қайтару", "Байланыс"],
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
    admin: { title: "Төлемдерді басқару", login: "Әкімшіге кіру", username: "Логин", password: "Құпиясөз", signIn: "Кіру", logout: "Шығу", create: "Сілтеме жасау", orders: "Транзакциялар", refresh: "Жаңарту" },
    legal: { service: "Қызмет сипаттамасы", terms: "Жария оферта", privacy: "Құпиялылық саясаты", refunds: "Қайтару ережелері", contacts: "Байланыс" },
  },
  en: {
    nav: ["Home", "Service", "Offer", "Privacy", "Refunds", "Contacts"],
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
    admin: { title: "Admin payments", login: "Admin sign in", username: "Username", password: "Password", signIn: "Sign in", logout: "Logout", create: "Create link", orders: "Transactions", refresh: "Refresh" },
    legal: { service: "Service description", terms: "Public offer", privacy: "Privacy policy", refunds: "Refund policy", contacts: "Contacts" },
  },
};

function money(amount, currency) {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: currency === "KZT" ? 0 : 2 }).format(Number(amount || 0))} ${currency}`;
}

function langHref(path, lang) {
  const params = new URLSearchParams(window.location.search);
  params.set("lang", lang);
  return `${path}?${params.toString()}`;
}

function Nav({ lang }) {
  const t = i18n[lang];
  const links = ["/", "/service", "/terms", "/privacy", "/refunds", "/contacts"];
  return (
    <nav className="top-nav">
      <a className="brand" href={langHref("/", lang)}><span className="brand-mark">CM</span><span>ClinMedKaz Pay</span></a>
      <div className="nav-links" id="primary-menu">{links.map((href, index) => <a key={href} href={langHref(href, lang)}>{t.nav[index]}</a>)}</div>
      <div className="lang-switch">{supportedLanguages.map((item) => <a key={item} className={item === lang ? "active" : ""} href={langHref(window.location.pathname, item)}>{item.toUpperCase()}</a>)}</div>
    </nav>
  );
}

function Footer({ ctx, lang }) {
  const b = ctx.config.business;
  return (
    <footer className="site-footer">
      <div><strong>{b.name}</strong><br />{b.country}, {b.city}<br />Support: <a href={`mailto:${b.supportEmail}`}>{b.supportEmail}</a>, {b.supportPhone}</div>
      <div className="payment-mark">
        {["epay-halyk.png", "halyk-bank.png", "visa.svg", "mastercard.svg", "three-d-secure.svg", "visa-secure.png"].map((name) => (
          <span className="payment-logo" key={name}><img src={`/assets/payments/${name}`} alt="" /></span>
        ))}
      </div>
    </footer>
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
    const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
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
    const response = await fetch(`/api/payments/${encodeURIComponent(ctx.order.id)}/payment-object`);
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

function AdminLogin({ lang }) {
  const t = i18n[lang].admin;
  const [status, setStatus] = useState("");
  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
    if (response.ok) window.location.href = "/admin";
    else setStatus(t.login);
  }
  return <section className="center-panel"><form className="panel login-panel" onSubmit={submit}><h1>{t.login}</h1><label>{t.username}<input name="username" required /></label><label>{t.password}<input name="password" type="password" required /></label><button className="primary-btn">{t.signIn}</button><p className="status-text">{status}</p></form></section>;
}

function AdminPage({ lang }) {
  const t = i18n[lang].admin;
  const [data, setData] = useState({ orders: [], invitations: [] });
  const [status, setStatus] = useState("");
  async function load() {
    const response = await fetch("/api/admin/orders", { credentials: "same-origin" });
    if (response.status === 401) { window.location.href = "/admin/login"; return; }
    setData(await response.json());
  }
  useEffect(() => { load(); }, []);
  async function create(event) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ ...raw, sendEmail: raw.sendEmail === "on" }) });
    const payload = await response.json().catch(() => ({}));
    setStatus(response.ok ? payload.link : payload.error);
    if (response.ok) load();
  }
  return (
    <section className="admin-shell">
      <div className="panel"><h1>{t.title}</h1><button className="secondary-btn" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>{t.logout}</button></div>
      <form className="panel" onSubmit={create}><h2>{t.create}</h2><label>Email<input name="email" type="email" required /></label><label>Full name<input name="fullName" /></label><label>Phone<input name="phone" /></label><label>Article<textarea name="articleTitle" required /></label><label>Lang<select name="lang" defaultValue={lang}><option value="ru">Русский</option><option value="kk">Қазақша</option><option value="en">English</option></select></label><label className="checkline"><input name="sendEmail" type="checkbox" defaultChecked /><span>Email</span></label><button className="primary-btn">{t.create}</button><p className="status-text">{status}</p></form>
      <div className="panel wide"><div className="table-header"><h2>{t.orders}</h2><button className="secondary-btn" onClick={load}>{t.refresh}</button></div><div className="table-wrap"><table><thead><tr><th>Status</th><th>Invoice</th><th>Author</th><th>Article</th><th>Amount</th></tr></thead><tbody>{(data.orders || []).map((order) => <tr key={order.id}><td><span className={`badge badge-${order.status}`}>{order.status}</span></td><td>{order.invoiceId}</td><td>{order.fullName}<br /><small>{order.email}</small></td><td>{order.articleTitle}</td><td>{order.amount} {order.currency}</td></tr>)}</tbody></table></div></div>
    </section>
  );
}

function LegalPage({ ctx, lang, kind }) {
  const t = i18n[lang].legal;
  const b = ctx.config.business;
  return <section className="doc-page panel"><h1>{t[kind] || t.service}</h1><p>{b.name} accepts online payment for ClinMedKaz article publication services.</p><p>{b.country}, {b.city}. {b.legalAddress}</p><p>Support: {b.supportEmail}, {b.supportPhone}</p></section>;
}

function App() {
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("path", window.location.pathname);
    fetch(`/api/public/context?${params.toString()}`, { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load page")))
      .then(setCtx)
      .catch((err) => setError(err.message));
  }, []);
  const lang = useMemo(() => supportedLanguages.includes(ctx?.lang) ? ctx.lang : "ru", [ctx]);
  if (error) return <main className="center-panel"><div className="panel danger"><h1>{error}</h1></div></main>;
  if (!ctx) return <main className="center-panel"><div className="panel">Loading...</div></main>;
  const path = window.location.pathname;
  let page;
  if (path === "/") page = <PaymentForm ctx={ctx} lang={lang} />;
  else if (path.startsWith("/pay/")) {
    const closedStatuses = ["failed", "postlink_rejected", "cancelled", "refunded"];
    if (!ctx.order || closedStatuses.includes(ctx.order.status)) page = <ResultPage ctx={ctx} lang={lang} ok={false} />;
    else if (ctx.order.status === "paid") page = <ResultPage ctx={ctx} lang={lang} ok />;
    else page = <PayPage ctx={ctx} lang={lang} />;
  }
  else if (path.startsWith("/payment/success/")) page = <ResultPage ctx={ctx} lang={lang} ok />;
  else if (path.startsWith("/payment/failure/")) page = <ResultPage ctx={ctx} lang={lang} ok={false} />;
  else if (path === "/admin/login") page = <AdminLogin lang={lang} />;
  else if (path === "/admin") page = ctx.adminAuthenticated ? <AdminPage lang={lang} /> : <AdminLogin lang={lang} />;
  else page = <LegalPage ctx={ctx} lang={lang} kind={path.slice(1)} />;
  return <><Nav lang={lang} /><main>{page}</main><Footer ctx={ctx} lang={lang} /></>;
}

createRoot(document.getElementById("app")).render(<App />);
