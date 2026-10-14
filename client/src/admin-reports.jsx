import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, clearAdminJwt, dateLocales, formatDate, formatDay, formatNumber, money } from "./shared";

const kkMonths = ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."];

export const reportsI18n = {
  ru: {
    roles: { admin: "Администратор", accountant: "Бухгалтер", economist: "Экономист" },
    tabs: { finance: "Финансы", analytics: "Аналитика" },
    period: {
      thisMonth: "Этот месяц",
      lastMonth: "Прошлый месяц",
      quarter: "Квартал",
      year: "С начала года",
      last12: "12 месяцев",
      from: "С",
      to: "По",
      apply: "Показать",
    },
    loading: "Считаем отчёт…",
    loadError: "Не удалось загрузить отчёт.",
    periodError: "Проверьте период: дата начала не позже даты окончания, не больше трёх лет.",
    noAccess: "У этой учётной записи нет доступа к отчёту.",
    exportCsv: "Скачать CSV",
    exportError: "Не удалось скачать файл.",
    empty: "За выбранный период данных нет.",
    accounting: { new: "Не сверен", reconciled: "Сверен", exported: "Выгружен в учёт", disputed: "Спорный" },
    refund: { none: "Нет", requested: "Запрошен", approved: "Одобрен", rejected: "Отклонён", processed: "Выполнен" },
    residency: { resident_kz: "Резиденты РК", non_resident: "Нерезиденты" },
    residencyOne: { resident_kz: "Резидент РК", non_resident: "Нерезидент" },
    unknownCountry: "Не указана",
    finance: {
      title: "Финансы",
      lead: "Поступления и возвраты по дате банковской операции. Время — Астана (UTC+5).",
      received: "Поступило",
      refunded: "Возвраты",
      net: "Итого",
      payments: (count) => `${count} ${plural(count, "оплата", "оплаты", "оплат")}`,
      refunds: (count) => `${count} ${plural(count, "возврат", "возврата", "возвратов")}`,
      kztTotal: "Всего в тенге",
      kztHint: "ориентировочно, USD по курсу ссылки",
      note: "Суммы указаны без комиссии Halyk ePay: на счёт банк зачисляет их за вычетом комиссии. Пересчёт USD в тенге ориентировочный (курс на дату создания ссылки); официальная переоценка ведётся в учётной системе.",
      attention: "Требует внимания",
      allClear: "Все оплаты сверены, спорных операций и незавершённых возвратов нет.",
      unreconciled: (count) => `Не сверено: ${count} ${plural(count, "оплата", "оплаты", "оплат")}`,
      oldest: "самая ранняя",
      disputed: "Спорные операции",
      refundsInProgress: "Возвраты в работе",
      statusBreakdown: "Статус сверки оплат за период",
      daily: "По дням",
      dailyLead: "Для сверки с выпиской банка.",
      registry: "Реестр оплат",
      registryLead: "Отметьте статус сверки прямо в таблице.",
      refundsRegistry: "Реестр возвратов",
      col: {
        date: "Дата",
        currency: "Валюта",
        count: "Оплат",
        received: "Поступило",
        refunds: "Возвраты",
        net: "Итого",
        paidAt: "Дата оплаты",
        refundedAt: "Дата возврата",
        invoice: "Инвойс / референс",
        payer: "Плательщик",
        article: "Статья",
        amount: "Сумма",
        kzt: "KZT-экв.",
        accounting: "Сверка",
        reason: "Причина",
        refund: "Возврат",
      },
      saveError: "Не удалось сохранить статус.",
    },
    analytics: {
      title: "Аналитика",
      lead: "Сводные показатели без персональных данных. Суммы — в тенге (USD по курсу ссылки).",
      netRevenue: "Чистая выручка",
      grossNote: (gross, refunds) => `поступления ${gross} − возвраты ${refunds}`,
      paidCount: "Оплачено статей",
      averageCheck: "Средний чек",
      conversion: "Конверсия ссылок",
      conversionNote: "доля оплаченных среди созданных за период",
      medianDays: "Срок до оплаты",
      medianNote: "медиана, дней",
      refundRate: "Доля возвратов",
      days: (value) => `${formatNumber(value, "ru", { maximumFractionDigits: 1 })} дн.`,
      monthly: "Выручка по месяцам",
      monthlyLead: "Чистая выручка (поступления минус возвраты).",
      col: {
        month: "Месяц",
        links: "Ссылок",
        paid: "Оплачено",
        gross: "Поступления",
        refunds: "Возвраты",
        net: "Чистая",
        average: "Средний чек",
        country: "Страна",
        share: "Доля",
        currency: "Валюта",
        amount: "Сумма",
        kzt: "KZT-экв.",
        bucket: "Срок",
        count: "Кол-во",
        expected: "Ожидается",
      },
      structure: "Структура выручки",
      residency: "По резидентству",
      currencies: "По валютам",
      countries: "География авторов",
      funnel: "Воронка ссылок на оплату",
      funnelLead: "Ссылки, созданные за период: сколько дошло до оплаты.",
      funnelSteps: { created: "Создано", opened: "Открыто", started: "Начата оплата", paid: "Оплачено" },
      funnelRest: (cancelled, pending) => `Отменено: ${cancelled} · ещё не оплачено: ${pending}`,
      timeToPay: "Сколько дней проходит до оплаты",
      timeToPayLead: (median, average) => `Медиана ${median ?? "—"} · в среднем ${average ?? "—"} дн.`,
      buckets: { "0-1": "до 1 дня", "2-7": "2–7 дней", "8-30": "8–30 дней", "31+": "больше 30 дней", "0-7": "до 7 дней", "31-90": "31–90 дней", "91+": "больше 90 дней" },
      discounts: "Индивидуальные цены",
      discountsLead: "Оплаты по индивидуальной цене в сравнении со стандартной ценой той же ссылки.",
      discountLinks: "Ссылок с индивидуальной ценой",
      discountPaid: "Из них оплачено (за период)",
      standard: "По стандартной цене",
      actual: "Фактически получено",
      difference: "Разница",
      pipeline: "Ожидаемые поступления",
      pipelineLead: "Отправленные, но ещё не оплаченные ссылки на сегодня. Оценка по цене в тенге.",
      pipelineTotal: (count) => `${count} ${plural(count, "ссылка", "ссылки", "ссылок")}`,
      pricing: "Текущая цена",
      resident: "Резидентам РК",
      nonResident: "Нерезидентам",
      rate: "Курс USD/KZT",
      rateAuto: (date) => `НБ РК${date ? ` на ${date}` : ""}`,
      rateManual: "задан вручную",
      chartLabel: "Чистая выручка по месяцам, тенге",
    },
    order: {
      summary: "Учёт и возврат",
      accounting: "Статус сверки",
      refund: "Возврат",
      reason: "Причина возврата",
      comment: "Комментарий",
      save: "Сохранить",
      saving: "Сохраняем…",
      saved: "Сохранено",
      error: "Не удалось сохранить.",
      reasonRequired: "Укажите причину возврата.",
      refundHint: "Сам возврат делается в кабинете Halyk ePay — здесь он только отмечается.",
      confirmRefund: "Отметить возврат как выполненный? Заказ получит статус «Возврат выполнен», и это нельзя отменить из панели.",
    },
  },
  kk: {
    roles: { admin: "Әкімші", accountant: "Бухгалтер", economist: "Экономист" },
    tabs: { finance: "Қаржы", analytics: "Аналитика" },
    period: {
      thisMonth: "Осы ай",
      lastMonth: "Өткен ай",
      quarter: "Тоқсан",
      year: "Жыл басынан",
      last12: "12 ай",
      from: "Бастап",
      to: "Дейін",
      apply: "Көрсету",
    },
    loading: "Есеп құрылуда…",
    loadError: "Есепті жүктеу мүмкін болмады.",
    periodError: "Кезеңді тексеріңіз: басталу күні аяқталу күнінен кеш емес, үш жылдан аспауы керек.",
    noAccess: "Бұл есептік жазбада есепке рұқсат жоқ.",
    exportCsv: "CSV жүктеу",
    exportError: "Файлды жүктеу мүмкін болмады.",
    empty: "Таңдалған кезеңде деректер жоқ.",
    accounting: { new: "Салыстырылмаған", reconciled: "Салыстырылды", exported: "Есепке жүктелді", disputed: "Даулы" },
    refund: { none: "Жоқ", requested: "Сұралды", approved: "Мақұлданды", rejected: "Қабылданбады", processed: "Орындалды" },
    residency: { resident_kz: "ҚР резиденттері", non_resident: "Бейрезиденттер" },
    residencyOne: { resident_kz: "ҚР резиденті", non_resident: "Бейрезидент" },
    unknownCountry: "Көрсетілмеген",
    finance: {
      title: "Қаржы",
      lead: "Түсімдер мен қайтарулар банк операциясының күні бойынша. Уақыт — Астана (UTC+5).",
      received: "Түсті",
      refunded: "Қайтарулар",
      net: "Барлығы",
      payments: (count) => `${count} төлем`,
      refunds: (count) => `${count} қайтару`,
      kztTotal: "Барлығы теңгемен",
      kztHint: "шамамен, USD сілтеме бағамымен",
      note: "Сомалар Halyk ePay комиссиясынсыз көрсетілген: банк шотқа комиссияны шегеріп аударады. USD-ны теңгеге қайта есептеу шамамен (сілтеме жасалған күнгі бағам); ресми қайта бағалау есеп жүйесінде жүргізіледі.",
      attention: "Назар аударыңыз",
      allClear: "Барлық төлемдер салыстырылды, даулы операциялар мен аяқталмаған қайтарулар жоқ.",
      unreconciled: (count) => `Салыстырылмаған: ${count} төлем`,
      oldest: "ең ертесі",
      disputed: "Даулы операциялар",
      refundsInProgress: "Өңделіп жатқан қайтарулар",
      statusBreakdown: "Кезеңдегі төлемдерді салыстыру мәртебесі",
      daily: "Күндер бойынша",
      dailyLead: "Банк үзіндісімен салыстыру үшін.",
      registry: "Төлемдер тізілімі",
      registryLead: "Салыстыру мәртебесін тікелей кестеде белгілеңіз.",
      refundsRegistry: "Қайтарулар тізілімі",
      col: {
        date: "Күні",
        currency: "Валюта",
        count: "Төлемдер",
        received: "Түсті",
        refunds: "Қайтарулар",
        net: "Барлығы",
        paidAt: "Төлем күні",
        refundedAt: "Қайтару күні",
        invoice: "Инвойс / референс",
        payer: "Төлеуші",
        article: "Мақала",
        amount: "Сома",
        kzt: "KZT-бал.",
        accounting: "Салыстыру",
        reason: "Себебі",
        refund: "Қайтару",
      },
      saveError: "Мәртебені сақтау мүмкін болмады.",
    },
    analytics: {
      title: "Аналитика",
      lead: "Дербес деректерсіз жиынтық көрсеткіштер. Сомалар теңгемен (USD сілтеме бағамымен).",
      netRevenue: "Таза түсім",
      grossNote: (gross, refunds) => `түсімдер ${gross} − қайтарулар ${refunds}`,
      paidCount: "Төленген мақалалар",
      averageCheck: "Орташа чек",
      conversion: "Сілтемелер конверсиясы",
      conversionNote: "кезеңде жасалғандардың ішінен төленгендердің үлесі",
      medianDays: "Төлемге дейінгі мерзім",
      medianNote: "медиана, күн",
      refundRate: "Қайтарулар үлесі",
      days: (value) => `${formatNumber(value, "kk", { maximumFractionDigits: 1 })} күн`,
      monthly: "Айлар бойынша түсім",
      monthlyLead: "Таза түсім (түсімдер минус қайтарулар).",
      col: {
        month: "Ай",
        links: "Сілтемелер",
        paid: "Төленді",
        gross: "Түсімдер",
        refunds: "Қайтарулар",
        net: "Таза",
        average: "Орташа чек",
        country: "Ел",
        share: "Үлесі",
        currency: "Валюта",
        amount: "Сома",
        kzt: "KZT-бал.",
        bucket: "Мерзім",
        count: "Саны",
        expected: "Күтілуде",
      },
      structure: "Түсім құрылымы",
      residency: "Резиденттік бойынша",
      currencies: "Валюталар бойынша",
      countries: "Авторлар географиясы",
      funnel: "Төлем сілтемелерінің воронкасы",
      funnelLead: "Кезеңде жасалған сілтемелер: қаншасы төлемге жетті.",
      funnelSteps: { created: "Жасалды", opened: "Ашылды", started: "Төлем басталды", paid: "Төленді" },
      funnelRest: (cancelled, pending) => `Бас тартылды: ${cancelled} · әлі төленбеген: ${pending}`,
      timeToPay: "Төлемге дейін неше күн өтеді",
      timeToPayLead: (median, average) => `Медиана ${median ?? "—"} · орташа ${average ?? "—"} күн`,
      buckets: { "0-1": "1 күнге дейін", "2-7": "2–7 күн", "8-30": "8–30 күн", "31+": "30 күннен көп", "0-7": "7 күнге дейін", "31-90": "31–90 күн", "91+": "90 күннен көп" },
      discounts: "Жеке бағалар",
      discountsLead: "Жеке баға бойынша төлемдер сол сілтеменің стандартты бағасымен салыстырылады.",
      discountLinks: "Жеке бағасы бар сілтемелер",
      discountPaid: "Оның ішінде төленгені (кезеңде)",
      standard: "Стандартты баға бойынша",
      actual: "Іс жүзінде алынды",
      difference: "Айырма",
      pipeline: "Күтілетін түсімдер",
      pipelineLead: "Жіберілген, бірақ әлі төленбеген сілтемелер (бүгінгі күнге). Теңгедегі баға бойынша бағалау.",
      pipelineTotal: (count) => `${count} сілтеме`,
      pricing: "Ағымдағы баға",
      resident: "ҚР резиденттеріне",
      nonResident: "Бейрезиденттерге",
      rate: "USD/KZT бағамы",
      rateAuto: (date) => `ҚР ҰБ${date ? `, ${date}` : ""}`,
      rateManual: "қолмен белгіленген",
      chartLabel: "Айлар бойынша таза түсім, теңге",
    },
    order: {
      summary: "Есеп және қайтару",
      accounting: "Салыстыру мәртебесі",
      refund: "Қайтару",
      reason: "Қайтару себебі",
      comment: "Түсініктеме",
      save: "Сақтау",
      saving: "Сақталуда…",
      saved: "Сақталды",
      error: "Сақтау мүмкін болмады.",
      reasonRequired: "Қайтару себебін көрсетіңіз.",
      refundHint: "Қайтарудың өзі Halyk ePay кабинетінде жасалады — мұнда тек белгіленеді.",
      confirmRefund: "Қайтаруды орындалды деп белгілеу керек пе? Тапсырыс «Қаражат қайтарылды» мәртебесін алады, мұны панельден болдырмау мүмкін емес.",
    },
  },
  en: {
    roles: { admin: "Administrator", accountant: "Accountant", economist: "Economist" },
    tabs: { finance: "Finance", analytics: "Analytics" },
    period: {
      thisMonth: "This month",
      lastMonth: "Last month",
      quarter: "Quarter",
      year: "Year to date",
      last12: "12 months",
      from: "From",
      to: "To",
      apply: "Show",
    },
    loading: "Building the report…",
    loadError: "Could not load the report.",
    periodError: "Check the period: the start must not be after the end, and it cannot exceed three years.",
    noAccess: "This account does not have access to the report.",
    exportCsv: "Download CSV",
    exportError: "Could not download the file.",
    empty: "No data for the selected period.",
    accounting: { new: "Not reconciled", reconciled: "Reconciled", exported: "Exported to accounting", disputed: "Disputed" },
    refund: { none: "None", requested: "Requested", approved: "Approved", rejected: "Rejected", processed: "Processed" },
    residency: { resident_kz: "Kazakhstan residents", non_resident: "Non-residents" },
    residencyOne: { resident_kz: "Kazakhstan resident", non_resident: "Non-resident" },
    unknownCountry: "Not specified",
    finance: {
      title: "Finance",
      lead: "Receipts and refunds by bank transaction date. Times are Astana (UTC+5).",
      received: "Received",
      refunded: "Refunds",
      net: "Net",
      payments: (count) => `${count} ${count === 1 ? "payment" : "payments"}`,
      refunds: (count) => `${count} ${count === 1 ? "refund" : "refunds"}`,
      kztTotal: "Total in tenge",
      kztHint: "indicative, USD at the link rate",
      note: "Amounts exclude the Halyk ePay fee: the bank credits the account net of its fee. USD-to-tenge figures are indicative (rate on the day the link was created); the official revaluation is done in the accounting system.",
      attention: "Needs attention",
      allClear: "All payments are reconciled; no disputed transactions or open refunds.",
      unreconciled: (count) => `Not reconciled: ${count} ${count === 1 ? "payment" : "payments"}`,
      oldest: "oldest",
      disputed: "Disputed transactions",
      refundsInProgress: "Refunds in progress",
      statusBreakdown: "Reconciliation status of the period's payments",
      daily: "By day",
      dailyLead: "For matching against the bank statement.",
      registry: "Payments register",
      registryLead: "Set the reconciliation status right in the table.",
      refundsRegistry: "Refunds register",
      col: {
        date: "Date",
        currency: "Currency",
        count: "Payments",
        received: "Received",
        refunds: "Refunds",
        net: "Net",
        paidAt: "Paid at",
        refundedAt: "Refunded at",
        invoice: "Invoice / reference",
        payer: "Payer",
        article: "Article",
        amount: "Amount",
        kzt: "KZT eq.",
        accounting: "Reconciliation",
        reason: "Reason",
        refund: "Refund",
      },
      saveError: "Could not save the status.",
    },
    analytics: {
      title: "Analytics",
      lead: "Aggregated figures without personal data. Amounts in tenge (USD at the link rate).",
      netRevenue: "Net revenue",
      grossNote: (gross, refunds) => `received ${gross} − refunds ${refunds}`,
      paidCount: "Articles paid",
      averageCheck: "Average payment",
      conversion: "Link conversion",
      conversionNote: "share of links created in the period that were paid",
      medianDays: "Time to pay",
      medianNote: "median, days",
      refundRate: "Refund rate",
      days: (value) => `${formatNumber(value, "en", { maximumFractionDigits: 1 })} d`,
      monthly: "Revenue by month",
      monthlyLead: "Net revenue (receipts minus refunds).",
      col: {
        month: "Month",
        links: "Links",
        paid: "Paid",
        gross: "Received",
        refunds: "Refunds",
        net: "Net",
        average: "Average",
        country: "Country",
        share: "Share",
        currency: "Currency",
        amount: "Amount",
        kzt: "KZT eq.",
        bucket: "Age",
        count: "Count",
        expected: "Expected",
      },
      structure: "Revenue structure",
      residency: "By residency",
      currencies: "By currency",
      countries: "Author geography",
      funnel: "Payment link funnel",
      funnelLead: "Links created in the period and how many reached payment.",
      funnelSteps: { created: "Created", opened: "Opened", started: "Payment started", paid: "Paid" },
      funnelRest: (cancelled, pending) => `Cancelled: ${cancelled} · not paid yet: ${pending}`,
      timeToPay: "Days from link to payment",
      timeToPayLead: (median, average) => `Median ${median ?? "—"} · average ${average ?? "—"} days`,
      buckets: { "0-1": "up to 1 day", "2-7": "2–7 days", "8-30": "8–30 days", "31+": "over 30 days", "0-7": "up to 7 days", "31-90": "31–90 days", "91+": "over 90 days" },
      discounts: "Individual prices",
      discountsLead: "Payments at an individual price compared with the standard price of the same link.",
      discountLinks: "Links with an individual price",
      discountPaid: "Of them paid (in the period)",
      standard: "At the standard price",
      actual: "Actually received",
      difference: "Difference",
      pipeline: "Expected receipts",
      pipelineLead: "Links sent but not paid yet, as of today. Estimated at the tenge price.",
      pipelineTotal: (count) => `${count} ${count === 1 ? "link" : "links"}`,
      pricing: "Current price",
      resident: "Kazakhstan residents",
      nonResident: "Non-residents",
      rate: "USD/KZT rate",
      rateAuto: (date) => `National Bank${date ? `, ${date}` : ""}`,
      rateManual: "set manually",
      chartLabel: "Net revenue by month, tenge",
    },
    order: {
      summary: "Accounting and refund",
      accounting: "Reconciliation status",
      refund: "Refund",
      reason: "Refund reason",
      comment: "Comment",
      save: "Save",
      saving: "Saving…",
      saved: "Saved",
      error: "Could not save.",
      reasonRequired: "Enter the refund reason.",
      refundHint: "The refund itself is made in the Halyk ePay merchant portal; here it is only recorded.",
      confirmRefund: "Mark the refund as processed? The order becomes \"Refunded\" and this cannot be undone from the panel.",
    },
  },
};

function plural(count, one, few, many) {
  const rule = new Intl.PluralRules("ru").select(count);
  return rule === "one" ? one : rule === "few" ? few : many;
}

export function reportsText(lang) {
  return reportsI18n[lang] || reportsI18n.ru;
}

const ACCOUNTING_STATUSES = ["new", "reconciled", "exported", "disputed"];
const REFUND_STATUSES = ["none", "requested", "approved", "rejected", "processed"];

function kzt(value, lang) {
  return money(value, "KZT", lang);
}

function percent(value, lang) {
  return `${formatNumber((value || 0) * 100, lang, { maximumFractionDigits: 1 })}%`;
}

function monthLabel(month, lang, withYear = true) {
  const [year, index] = month.split("-").map(Number);
  if (lang === "kk") return withYear ? `${kkMonths[index - 1]} ${year}` : kkMonths[index - 1];
  const options = withYear ? { month: "short", year: "numeric" } : { month: "short" };
  return new Intl.DateTimeFormat(dateLocales[lang] || dateLocales.ru, options).format(new Date(year, index - 1, 1));
}

function isoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function presetPeriod(preset) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  if (preset === "lastMonth") return { from: isoDay(new Date(year, month - 1, 1)), to: isoDay(new Date(year, month, 0)) };
  if (preset === "quarter") return { from: isoDay(new Date(year, month - (month % 3), 1)), to: isoDay(today) };
  if (preset === "year") return { from: isoDay(new Date(year, 0, 1)), to: isoDay(today) };
  if (preset === "last12") return { from: isoDay(new Date(year, month - 11, 1)), to: isoDay(today) };
  return { from: isoDay(new Date(year, month, 1)), to: isoDay(today) };
}

function periodQuery(period) {
  const params = new URLSearchParams();
  if (period.from) params.set("from", period.from);
  if (period.to) params.set("to", period.to);
  return params;
}

function PeriodPicker({ lang, period, presets, onChange }) {
  const t = reportsText(lang).period;
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);
  // Remembered so that presets covering the same dates (October is both "this month" and
  // "quarter") highlight the one that was clicked.
  const [chosen, setChosen] = useState(null);
  useEffect(() => { setFrom(period.from); setTo(period.to); }, [period.from, period.to]);
  const matches = (preset) => {
    const value = presetPeriod(preset);
    return value.from === period.from && value.to === period.to;
  };
  const active = chosen && matches(chosen) ? chosen : presets.find(matches);
  return (
    <form className="report-period" onSubmit={(event) => { event.preventDefault(); setChosen(null); onChange({ from, to }); }}>
      <div className="report-presets" role="group">
        {presets.map((preset) => (
          <button key={preset} type="button" className={active === preset ? "active" : ""} aria-pressed={active === preset} onClick={() => { setChosen(preset); onChange(presetPeriod(preset)); }}>{t[preset]}</button>
        ))}
      </div>
      <div className="admin-date-filters">
        <label><span>{t.from}</span><input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
        <label><span>{t.to}</span><input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
        <button className="secondary-btn" type="submit">{t.apply}</button>
      </div>
    </form>
  );
}

// Loads one report; a newer period supersedes an in-flight request.
function useReport(kind, period, lang, onAuthLost) {
  const [state, setState] = useState({ report: null, loading: true, error: "" });
  const seq = useRef(0);
  const load = () => {
    const current = ++seq.current;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    apiFetch(`/admin/reports/${kind}?${periodQuery(period).toString()}`)
      .then(async (response) => {
        if (current !== seq.current) return;
        if (response.status === 401) { clearAdminJwt(); onAuthLost(); return; }
        const payload = await response.json().catch(() => ({}));
        if (current !== seq.current) return;
        if (response.status === 403) { setState({ report: null, loading: false, error: reportsText(lang).noAccess }); return; }
        if (!response.ok) {
          const text = reportsText(lang);
          setState((previous) => ({ ...previous, loading: false, error: response.status === 400 ? text.periodError : text.loadError }));
          return;
        }
        setState({ report: payload.report, loading: false, error: "" });
      })
      .catch(() => {
        if (current === seq.current) setState((previous) => ({ ...previous, loading: false, error: reportsText(lang).loadError }));
      });
  };
  useEffect(load, [kind, period.from, period.to]);
  return { ...state, reload: load, setReport: (update) => setState((previous) => ({ ...previous, report: update(previous.report) })) };
}

async function downloadReportCsv(name, period, lang) {
  try {
    const params = periodQuery(period);
    params.set("report", name);
    params.set("lang", lang);
    const response = await apiFetch(`/admin/reports/export.csv?${params.toString()}`);
    if (!response.ok) throw new Error(String(response.status));
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinmedkaz-${name}-${period.from}_${period.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.alert(reportsText(lang).exportError);
  }
}

function ExportButton({ name, period, lang }) {
  return <button className="secondary-btn report-export" type="button" onClick={() => downloadReportCsv(name, period, lang)}>{reportsText(lang).exportCsv}</button>;
}

function ReportSection({ title, lead, action, children, className = "" }) {
  return (
    <section className={`report-section ${className}`}>
      <div className="report-section-head">
        <div><h3>{title}</h3>{lead && <p>{lead}</p>}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReportShell({ title, lead, lang, period, presets, onPeriodChange, state, children }) {
  return (
    <section className="panel report-panel">
      <div className="section-heading"><h2>{title}</h2><p>{lead}</p></div>
      <PeriodPicker lang={lang} period={period} presets={presets} onChange={onPeriodChange} />
      {state.error && <p className="status-text danger-text">{state.error}</p>}
      {state.loading && !state.report && <p className="report-loading" role="status"><span className="transactions-loading-dot" aria-hidden="true" />{reportsText(lang).loading}</p>}
      {state.report && <div className={`report-body${state.loading ? " is-refreshing" : ""}`} aria-busy={state.loading}>{children(state.report)}</div>}
    </section>
  );
}

export function FinanceReportPage({ lang, canEdit, onAuthLost }) {
  const all = reportsText(lang);
  const t = all.finance;
  const [period, setPeriod] = useState(() => presetPeriod("thisMonth"));
  const state = useReport("finance", period, lang, onAuthLost);
  const [saveError, setSaveError] = useState("");

  async function setAccounting(row, accountingStatus) {
    setSaveError("");
    const previous = row.accountingStatus;
    state.setReport((report) => ({ ...report, payments: report.payments.map((item) => item.id === row.id ? { ...item, accountingStatus } : item) }));
    try {
      const response = await apiFetch(`/admin/orders/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accountingStatus }),
      });
      if (response.status === 401) { clearAdminJwt(); onAuthLost(); return; }
      if (!response.ok) throw new Error(String(response.status));
      state.reload();
    } catch {
      setSaveError(t.saveError);
      state.setReport((report) => ({ ...report, payments: report.payments.map((item) => item.id === row.id ? { ...item, accountingStatus: previous } : item) }));
    }
  }

  return (
    <ReportShell title={t.title} lead={t.lead} lang={lang} period={period} presets={["thisMonth", "lastMonth", "quarter", "year"]} onPeriodChange={setPeriod} state={state}>
      {(report) => {
        const attention = report.attention;
        const clear = !attention.unreconciled.count && !attention.disputed.length && !attention.refundsInProgress.length;
        return (
          <>
            <div className="report-tiles">
              {report.totals.length === 0 && <div className="report-tile"><span>{t.received}</span><strong>{kzt(0, lang)}</strong><small>{all.empty}</small></div>}
              {report.totals.map((row) => (
                <div className="report-tile" key={row.currency}>
                  <span>{t.received}, {row.currency}</span>
                  <strong>{money(row.paymentsAmount, row.currency, lang)}</strong>
                  <small>{t.payments(row.paymentsCount)}</small>
                  {row.refundsCount > 0 && <small>{t.refunded}: −{money(row.refundsAmount, row.currency, lang)} · {t.refunds(row.refundsCount)}</small>}
                  <small className="report-tile-net">{t.net}: {money(row.netAmount, row.currency, lang)}</small>
                </div>
              ))}
              {report.totals.length > 0 && (
                <div className="report-tile report-tile-muted">
                  <span>{t.kztTotal}</span>
                  <strong>{kzt(report.kztEquivalent.net, lang)}</strong>
                  <small>{t.kztHint}</small>
                </div>
              )}
            </div>
            <p className="report-note">{t.note}</p>

            <ReportSection title={t.attention} className={clear ? "is-clear" : "is-attention"}>
              {clear ? <p className="report-muted">{t.allClear}</p> : (
                <ul className="report-attention">
                  {attention.unreconciled.count > 0 && (
                    <li>
                      <strong>{t.unreconciled(attention.unreconciled.count)}</strong>
                      <span>{attention.unreconciled.totals.map((row) => money(row.amount, row.currency, lang)).join(" · ")}{attention.unreconciled.oldestPaidAt ? ` · ${t.oldest} ${formatDate(attention.unreconciled.oldestPaidAt, lang)}` : ""}</span>
                    </li>
                  )}
                  {attention.disputed.length > 0 && (
                    <li>
                      <strong>{t.disputed}: {attention.disputed.length}</strong>
                      {attention.disputed.map((row) => <span key={row.id}>{row.invoiceId} · {row.fullName} · {money(row.amount, row.currency, lang)}{row.adminComment ? ` · ${row.adminComment}` : ""}</span>)}
                    </li>
                  )}
                  {attention.refundsInProgress.length > 0 && (
                    <li>
                      <strong>{t.refundsInProgress}: {attention.refundsInProgress.length}</strong>
                      {attention.refundsInProgress.map((row) => <span key={row.id}>{row.invoiceId} · {row.fullName} · {money(row.amount, row.currency, lang)} · {all.refund[row.refundStatus]}{row.refundReason ? ` · ${row.refundReason}` : ""}</span>)}
                    </li>
                  )}
                </ul>
              )}
            </ReportSection>

            {report.payments.length > 0 && (
              <div className="report-chips" aria-label={t.statusBreakdown}>
                <span className="report-chips-label">{t.statusBreakdown}:</span>
                {ACCOUNTING_STATUSES.map((status) => <span key={status} className={`report-chip accounting-${status}`}>{all.accounting[status]} · {report.accounting[status] || 0}</span>)}
              </div>
            )}

            <ReportSection title={t.daily} lead={t.dailyLead} action={report.daily.length > 0 && <ExportButton name="daily" period={report.period} lang={lang} />}>
              {report.daily.length === 0 ? <p className="report-muted">{all.empty}</p> : (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead><tr><th>{t.col.date}</th><th>{t.col.currency}</th><th className="num">{t.col.count}</th><th className="num">{t.col.received}</th><th className="num">{t.col.refunds}</th><th className="num">{t.col.net}</th></tr></thead>
                    <tbody>
                      {report.daily.map((row) => (
                        <tr key={`${row.date}-${row.currency}`}>
                          <td>{formatDay(row.date, lang)}</td><td>{row.currency}</td><td className="num">{row.paymentsCount}</td>
                          <td className="num">{money(row.paymentsAmount, row.currency, lang)}</td>
                          <td className="num">{row.refundsAmount ? `−${money(row.refundsAmount, row.currency, lang)}` : "—"}</td>
                          <td className="num"><strong>{money(row.netAmount, row.currency, lang)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            <ReportSection title={t.registry} lead={canEdit ? t.registryLead : ""} action={report.payments.length > 0 && <ExportButton name="payments" period={report.period} lang={lang} />}>
              {saveError && <p className="status-text danger-text">{saveError}</p>}
              {report.payments.length === 0 ? <p className="report-muted">{all.empty}</p> : (
                <div className="report-table-wrap">
                  <table className="report-table report-registry">
                    <thead><tr><th>{t.col.paidAt}</th><th>{t.col.invoice}</th><th>{t.col.payer}</th><th>{t.col.article}</th><th className="num">{t.col.amount}</th><th className="num">{t.col.kzt}</th><th>{t.col.accounting}</th></tr></thead>
                    <tbody>
                      {report.payments.map((row) => (
                        <tr key={row.id} className={row.status === "refunded" ? "is-refunded" : ""}>
                          <td>{formatDate(row.paidAt, lang)}</td>
                          <td><strong>{row.invoiceId}</strong><small>{row.halykReference}{row.cardMask ? ` · ${row.cardMask}` : ""}</small></td>
                          <td>{row.fullName}<small>{row.email}</small><small>{all.residencyOne[row.residency] || ""}{row.country ? ` · ${row.country}` : ""}</small></td>
                          <td className="report-article">{row.articleTitle}</td>
                          <td className="num"><strong>{money(row.amount, row.currency, lang)}</strong>{row.status === "refunded" && <small>{t.col.refund}: {all.refund.processed}</small>}</td>
                          <td className="num">{kzt(row.kztEquivalent, lang)}{row.rate ? <small>× {formatNumber(row.rate, lang, { maximumFractionDigits: 2 })}</small> : null}</td>
                          <td>
                            {canEdit ? (
                              <select className={`report-select accounting-${row.accountingStatus}`} value={row.accountingStatus} disabled={state.loading} onChange={(event) => setAccounting(row, event.target.value)} aria-label={`${t.col.accounting} ${row.invoiceId}`}>
                                {ACCOUNTING_STATUSES.map((status) => <option key={status} value={status}>{all.accounting[status]}</option>)}
                              </select>
                            ) : <span className={`report-chip accounting-${row.accountingStatus}`}>{all.accounting[row.accountingStatus]}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>

            <ReportSection title={t.refundsRegistry} action={report.refunds.length > 0 && <ExportButton name="refunds" period={report.period} lang={lang} />}>
              {report.refunds.length === 0 ? <p className="report-muted">{all.empty}</p> : (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead><tr><th>{t.col.refundedAt}</th><th>{t.col.paidAt}</th><th>{t.col.invoice}</th><th>{t.col.payer}</th><th className="num">{t.col.amount}</th><th>{t.col.reason}</th></tr></thead>
                    <tbody>
                      {report.refunds.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.refundedAt, lang)}</td><td>{formatDate(row.paidAt, lang)}</td>
                          <td><strong>{row.invoiceId}</strong><small>{row.halykReference}</small></td>
                          <td>{row.fullName}<small>{row.email}</small></td>
                          <td className="num"><strong>{money(row.amount, row.currency, lang)}</strong></td>
                          <td>{row.refundReason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ReportSection>
          </>
        );
      }}
    </ReportShell>
  );
}

function niceScale(max) {
  if (max <= 0) return { top: 1, ticks: [0] };
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rough);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(value);
  return { top, ticks };
}

// One series (net revenue), so no legend: the section title names it. The table below is the
// accessible view of the same numbers.
function MonthlyChart({ months, lang }) {
  const t = reportsText(lang).analytics;
  const [active, setActive] = useState(null);
  const { top, ticks } = useMemo(() => niceScale(Math.max(0, ...months.map((row) => row.netKzt))), [months]);
  const compact = (value) => formatNumber(value, lang, { notation: "compact", maximumFractionDigits: 1 });
  const lastWithData = months.reduce((index, row, current) => (row.paidCount ? current : index), -1);
  return (
    <div className="month-chart" role="img" aria-label={t.chartLabel}>
      <div className="month-chart-axis" aria-hidden="true">
        {ticks.map((tick) => <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>{compact(tick)}</span>)}
      </div>
      <div className="month-chart-plot">
        <div className="month-chart-gridlayer" aria-hidden="true">
          {ticks.map((tick) => <span key={tick} className="month-chart-grid" style={{ bottom: `${(tick / top) * 100}%` }} />)}
        </div>
        {months.map((row, index) => {
          const height = Math.max(0, row.netKzt) / top * 100;
          const showYear = index === 0 || row.month.endsWith("-01");
          return (
            <div
              className={`month-chart-col${active === index ? " is-active" : ""}`}
              key={row.month}
              tabIndex={0}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              aria-label={`${monthLabel(row.month, lang)}: ${kzt(row.netKzt, lang)}`}
            >
              <div className="month-chart-bar-area">
                {index === lastWithData && row.netKzt > 0 && <span className="month-chart-value" style={{ bottom: `${height}%` }}>{compact(row.netKzt)}</span>}
                <span className="month-chart-bar" style={{ height: `${height}%` }} />
              </div>
              <span className="month-chart-label">{monthLabel(row.month, lang, false)}{showYear && <small>{row.month.slice(0, 4)}</small>}</span>
              {active === index && (
                <div className="month-chart-tooltip" role="tooltip">
                  <strong>{monthLabel(row.month, lang)}</strong>
                  <span>{t.col.net}: {kzt(row.netKzt, lang)}</span>
                  <span>{t.col.paid}: {row.paidCount}</span>
                  {row.refundsKzt > 0 && <span>{t.col.refunds}: −{kzt(row.refundsKzt, lang)}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShareBar({ value }) {
  return <span className="share-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} /></span>;
}

export function AnalyticsReportPage({ lang, onAuthLost }) {
  const all = reportsText(lang);
  const t = all.analytics;
  const [period, setPeriod] = useState(() => presetPeriod("last12"));
  const state = useReport("analytics", period, lang, onAuthLost);

  return (
    <ReportShell title={t.title} lead={t.lead} lang={lang} period={period} presets={["last12", "year", "quarter", "thisMonth", "lastMonth"]} onPeriodChange={setPeriod} state={state}>
      {(report) => {
        const { kpi, funnel } = report;
        const funnelSteps = ["created", "opened", "started", "paid"];
        const maxBucket = Math.max(1, ...report.timeToPay.buckets.map((row) => row.count));
        return (
          <>
            <div className="report-tiles report-kpis">
              <div className="report-tile report-hero">
                <span>{t.netRevenue}</span>
                <strong>{kzt(kpi.netKzt, lang)}</strong>
                <small>{t.grossNote(kzt(kpi.grossKzt, lang), kzt(kpi.refundsKzt, lang))}</small>
              </div>
              <div className="report-tile"><span>{t.paidCount}</span><strong>{formatNumber(kpi.paidCount, lang)}</strong></div>
              <div className="report-tile"><span>{t.averageCheck}</span><strong>{kzt(kpi.averageCheckKzt, lang)}</strong></div>
              <div className="report-tile"><span>{t.conversion}</span><strong>{percent(kpi.conversion, lang)}</strong><small>{t.conversionNote}</small></div>
              <div className="report-tile"><span>{t.medianDays}</span><strong>{kpi.medianDaysToPay === null ? "—" : t.days(kpi.medianDaysToPay)}</strong><small>{t.medianNote}</small></div>
              <div className="report-tile"><span>{t.refundRate}</span><strong>{percent(kpi.refundRate, lang)}</strong></div>
            </div>

            <ReportSection title={t.monthly} lead={t.monthlyLead} action={<ExportButton name="monthly" period={report.period} lang={lang} />}>
              {kpi.paidCount + kpi.refundsCount === 0 ? <p className="report-muted">{all.empty}</p> : <MonthlyChart months={report.monthly} lang={lang} />}
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead><tr><th>{t.col.month}</th><th className="num">{t.col.links}</th><th className="num">{t.col.paid}</th><th className="num">{t.col.gross}</th><th className="num">{t.col.refunds}</th><th className="num">{t.col.net}</th><th className="num">{t.col.average}</th></tr></thead>
                  <tbody>
                    {report.monthly.map((row) => (
                      <tr key={row.month}>
                        <td>{monthLabel(row.month, lang)}</td><td className="num">{row.linksCreated}</td><td className="num">{row.paidCount}</td>
                        <td className="num">{kzt(row.grossKzt, lang)}</td><td className="num">{row.refundsKzt ? `−${kzt(row.refundsKzt, lang)}` : "—"}</td>
                        <td className="num"><strong>{kzt(row.netKzt, lang)}</strong></td><td className="num">{row.averageCheckKzt ? kzt(row.averageCheckKzt, lang) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportSection>

            <div className="report-columns">
              <ReportSection title={t.residency}>
                {report.residency.length === 0 ? <p className="report-muted">{all.empty}</p> : (
                  <ul className="share-list">
                    {report.residency.map((row) => (
                      <li key={row.residency}>
                        <span className="share-list-name">{all.residency[row.residency]}</span>
                        <ShareBar value={row.share} />
                        <span className="share-list-value"><strong>{percent(row.share, lang)}</strong><small>{kzt(row.grossKzt, lang)} · {row.paidCount}</small></span>
                      </li>
                    ))}
                  </ul>
                )}
              </ReportSection>
              <ReportSection title={t.currencies}>
                {report.currencies.length === 0 ? <p className="report-muted">{all.empty}</p> : (
                  <div className="report-table-wrap">
                    <table className="report-table">
                      <thead><tr><th>{t.col.currency}</th><th className="num">{t.col.paid}</th><th className="num">{t.col.amount}</th><th className="num">{t.col.kzt}</th></tr></thead>
                      <tbody>
                        {report.currencies.map((row) => (
                          <tr key={row.currency}><td>{row.currency}</td><td className="num">{row.paidCount}</td><td className="num">{money(row.amount, row.currency, lang)}</td><td className="num">{kzt(row.kztEquivalent, lang)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ReportSection>
            </div>

            <ReportSection title={t.countries} action={report.countries.length > 0 && <ExportButton name="countries" period={report.period} lang={lang} />}>
              {report.countries.length === 0 ? <p className="report-muted">{all.empty}</p> : (
                <ul className="share-list">
                  {report.countries.map((row) => (
                    <li key={row.country || "unknown"}>
                      <span className="share-list-name">{row.country || all.unknownCountry}</span>
                      <ShareBar value={row.share} />
                      <span className="share-list-value"><strong>{percent(row.share, lang)}</strong><small>{kzt(row.grossKzt, lang)} · {row.paidCount}</small></span>
                    </li>
                  ))}
                </ul>
              )}
            </ReportSection>

            <div className="report-columns">
              <ReportSection title={t.funnel} lead={t.funnelLead}>
                {funnel.created === 0 ? <p className="report-muted">{all.empty}</p> : (
                  <>
                    <ul className="share-list funnel-list">
                      {funnelSteps.map((step) => (
                        <li key={step}>
                          <span className="share-list-name">{t.funnelSteps[step]}</span>
                          <ShareBar value={funnel[step] / funnel.created} />
                          <span className="share-list-value"><strong>{funnel[step]}</strong><small>{percent(funnel[step] / funnel.created, lang)}</small></span>
                        </li>
                      ))}
                    </ul>
                    <p className="report-muted">{t.funnelRest(funnel.cancelled, funnel.pending)}</p>
                  </>
                )}
              </ReportSection>
              <ReportSection title={t.timeToPay} lead={report.timeToPay.medianDays === null ? "" : t.timeToPayLead(
                formatNumber(report.timeToPay.medianDays, lang, { maximumFractionDigits: 1 }),
                formatNumber(report.timeToPay.averageDays, lang, { maximumFractionDigits: 1 })
              )}>
                {report.timeToPay.medianDays === null ? <p className="report-muted">{all.empty}</p> : <ul className="share-list">
                  {report.timeToPay.buckets.map((row) => (
                    <li key={row.bucket}>
                      <span className="share-list-name">{t.buckets[row.bucket]}</span>
                      <ShareBar value={row.count / maxBucket} />
                      <span className="share-list-value"><strong>{row.count}</strong></span>
                    </li>
                  ))}
                </ul>}
              </ReportSection>
            </div>

            <div className="report-columns">
              <ReportSection title={t.discounts} lead={t.discountsLead}>
                <dl className="report-facts">
                  <div><dt>{t.discountLinks}</dt><dd>{report.discounts.linksCreated}</dd></div>
                  <div><dt>{t.discountPaid}</dt><dd>{report.discounts.paidCount}</dd></div>
                  <div><dt>{t.standard}</dt><dd>{kzt(report.discounts.standardKzt, lang)}</dd></div>
                  <div><dt>{t.actual}</dt><dd>{kzt(report.discounts.actualKzt, lang)}</dd></div>
                  <div><dt>{t.difference}</dt><dd><strong>{kzt(report.discounts.differenceKzt, lang)}</strong></dd></div>
                </dl>
              </ReportSection>
              <ReportSection title={t.pricing}>
                <dl className="report-facts">
                  <div><dt>{t.resident}</dt><dd>{report.pricing.residentKztAmount === null ? "—" : money(report.pricing.residentKztAmount, "KZT", lang)}</dd></div>
                  <div><dt>{t.nonResident}</dt><dd>{report.pricing.nonResidentAmount === null ? "—" : money(report.pricing.nonResidentAmount, "USD", lang)}</dd></div>
                  <div><dt>{t.rate}</dt><dd>{formatNumber(report.pricing.usdToKztRate, lang, { maximumFractionDigits: 2 })}<small>{report.pricing.rateMode === "auto" ? t.rateAuto(report.pricing.rateDate ? formatDay(report.pricing.rateDate, lang) : "") : t.rateManual}</small></dd></div>
                </dl>
              </ReportSection>
            </div>

            <ReportSection title={t.pipeline} lead={t.pipelineLead}>
              <div className="report-pipeline">
                <div className="report-tile"><span>{t.pipelineTotal(report.pipeline.count)}</span><strong>{kzt(report.pipeline.expectedKzt, lang)}</strong></div>
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead><tr><th>{t.col.bucket}</th><th className="num">{t.col.count}</th><th className="num">{t.col.expected}</th></tr></thead>
                    <tbody>
                      {report.pipeline.aging.map((row) => (
                        <tr key={row.bucket}><td>{t.buckets[row.bucket]}</td><td className="num">{row.count}</td><td className="num">{kzt(row.expectedKzt, lang)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ReportSection>
          </>
        );
      }}
    </ReportShell>
  );
}

// Accounting fields of one order, shown in the transaction card to roles that may edit them.
export function OrderAccounting({ order, lang, onSaved, onAuthLost }) {
  const all = reportsText(lang);
  const t = all.order;
  const [accountingStatus, setAccountingStatus] = useState(order.accountingStatus || "new");
  const [refundStatus, setRefundStatus] = useState(order.refundStatus || "none");
  const [refundReason, setRefundReason] = useState(order.refundReason || "");
  const [adminComment, setAdminComment] = useState(order.adminComment || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const refunded = order.status === "refunded";
  const reasonNeeded = !refunded && ["requested", "approved", "processed"].includes(refundStatus);

  useEffect(() => {
    setAccountingStatus(order.accountingStatus || "new");
    setRefundStatus(order.refundStatus || "none");
    setRefundReason(order.refundReason || "");
    setAdminComment(order.adminComment || "");
  }, [order.accountingStatus, order.refundStatus, order.refundReason, order.adminComment]);

  async function save(event) {
    event.preventDefault();
    const patch = {};
    if (accountingStatus !== (order.accountingStatus || "new")) patch.accountingStatus = accountingStatus;
    if (!refunded && refundStatus !== (order.refundStatus || "none")) patch.refundStatus = refundStatus;
    if (refundReason !== (order.refundReason || "")) patch.refundReason = refundReason;
    if (adminComment !== (order.adminComment || "")) patch.adminComment = adminComment;
    if (!Object.keys(patch).length) return;
    if (patch.refundStatus && ["requested", "approved", "processed"].includes(patch.refundStatus) && !refundReason.trim()) {
      setStatus(t.reasonRequired);
      return;
    }
    if (patch.refundStatus === "processed" && !window.confirm(t.confirmRefund)) return;
    setSaving(true);
    setStatus("");
    try {
      const response = await apiFetch(`/admin/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (response.status === 401) { clearAdminJwt(); onAuthLost(); return; }
      if (!response.ok) throw new Error(String(response.status));
      setStatus(t.saved);
      onSaved();
    } catch {
      setStatus(t.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className="order-accounting">
      <summary>{t.summary}: <span className={`report-chip accounting-${order.accountingStatus || "new"}`}>{all.accounting[order.accountingStatus || "new"]}</span>{(order.refundStatus || "none") !== "none" && <span className="report-chip">{t.refund}: {all.refund[order.refundStatus]}</span>}</summary>
      <form onSubmit={save}>
        <label>{t.accounting}
          <select value={accountingStatus} onChange={(event) => setAccountingStatus(event.target.value)} disabled={saving}>
            {ACCOUNTING_STATUSES.map((value) => <option key={value} value={value}>{all.accounting[value]}</option>)}
          </select>
        </label>
        <label>{t.refund}
          <select value={refundStatus} onChange={(event) => setRefundStatus(event.target.value)} disabled={saving || refunded}>
            {REFUND_STATUSES.map((value) => <option key={value} value={value}>{all.refund[value]}</option>)}
          </select>
        </label>
        <label className="order-accounting-wide">{t.reason}{reasonNeeded && <span className="field-required" aria-hidden="true">*</span>}<input value={refundReason} maxLength={2000} required={reasonNeeded} aria-required={reasonNeeded} onChange={(event) => setRefundReason(event.target.value)} disabled={saving} /></label>
        <label className="order-accounting-wide">{t.comment}<textarea rows={2} value={adminComment} maxLength={2000} onChange={(event) => setAdminComment(event.target.value)} disabled={saving} /></label>
        <p className="order-accounting-hint">{t.refundHint}</p>
        <div className="order-accounting-actions">
          <button className="secondary-btn" type="submit" disabled={saving}>{saving ? t.saving : t.save}</button>
          {status && <span role="status">{status}</span>}
        </div>
      </form>
    </details>
  );
}
