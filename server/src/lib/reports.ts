import { fail } from './domain';

// Kazakhstan has been on a single UTC+5 zone since March 2024 (see todayInKazakhstan in
// pricing.ts); report days and months follow it, so a payment at 23:30 Astana time lands on
// the day the bank statement shows.
const KZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERIOD_DAYS = 3 * 366;

type Row = Record<string, any>;
export type ReportData = { orders: Row[]; invitations: Row[] };
export type ReportPricing = {
  usdToKztRate: number;
  residentKztAmount?: number;
  nonResidentAmount?: number;
  baseCurrency?: string;
  rateMode?: string;
  rateDate?: string | null;
};
export type Period = { from: string; to: string };

function timestamp(value: unknown): number | null {
  if (!value) return null;
  const parsed = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function localDay(value: unknown): string | null {
  const time = timestamp(value);
  return time === null ? null : new Date(time + KZ_OFFSET_MS).toISOString().slice(0, 10);
}

function localDateTime(value: unknown) {
  const time = timestamp(value);
  return time === null ? '' : new Date(time + KZ_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

function validDay(value: unknown) {
  const text = String(value || '').trim();
  if (!DATE_RE.test(text)) return null;
  const time = Date.parse(`${text}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === text ? text : null;
}

function shiftMonths(day: string, months: number) {
  const date = new Date(`${day.slice(0, 7)}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

// Inclusive local dates. Without input the period is the current month, or the last
// `defaultMonths` whole months including the current one.
export function resolvePeriod(input: { from?: unknown; to?: unknown } = {}, now = Date.now(), defaultMonths = 1): Period {
  if (input.from && !validDay(input.from)) throw fail('Period start must be a date in YYYY-MM-DD format.');
  if (input.to && !validDay(input.to)) throw fail('Period end must be a date in YYYY-MM-DD format.');
  const to = validDay(input.to) || (localDay(now) as string);
  const from = validDay(input.from) || shiftMonths(to, -(Math.max(1, defaultMonths) - 1));
  if (from > to) throw fail('Period start must not be after its end.');
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS > MAX_PERIOD_DAYS) throw fail('Period must not exceed three years.');
  return { from, to };
}

function inPeriod(value: unknown, period: Period) {
  const day = localDay(value);
  return Boolean(day) && (day as string) >= period.from && (day as string) <= period.to;
}

const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Bank time of the payment. Orders paid before paymentReceivedAt existed fall back to their last update.
export function paidAt(order: Row): string | null {
  if (!['paid', 'refunded'].includes(order.status)) return null;
  return order.paymentReceivedAt || order.updatedAt || null;
}

// Refunds are full-amount (refundStatus=processed turns the order into "refunded").
export function refundedAt(order: Row): string | null {
  if (order.status !== 'refunded') return null;
  return order.refundedAt || order.updatedAt || null;
}

// Indicative tenge value. USD payments use the rate frozen on the payment link, not the
// National Bank rate on the payment day, so official revaluation stays with accounting (1C).
function rateFor(order: Row, invitation: Row | undefined, pricing: ReportPricing) {
  if (order.currency === 'KZT') return 1;
  return Number(order.exchangeRate) || Number(invitation?.usdToKztRate) || Number(pricing.usdToKztRate) || 0;
}

function toKzt(amount: number, currency: string, rate: number) {
  return currency === 'KZT' ? Math.round(amount) : Math.round(amount * rate);
}

function currencyOrder(left: string, right: string) {
  const rank = (value: string) => (value === 'KZT' ? 0 : value === 'USD' ? 1 : 2);
  return rank(left) - rank(right) || left.localeCompare(right);
}

function byPaidAt(left: Row, right: Row) {
  return (timestamp(paidAt(left)) || 0) - (timestamp(paidAt(right)) || 0);
}

type CurrencyTotals = {
  currency: string;
  paymentsCount: number;
  paymentsAmount: number;
  refundsCount: number;
  refundsAmount: number;
  netAmount: number;
};

function emptyTotals(currency: string): CurrencyTotals {
  return { currency, paymentsCount: 0, paymentsAmount: 0, refundsCount: 0, refundsAmount: 0, netAmount: 0 };
}

export function buildFinanceReport(data: ReportData, pricing: ReportPricing, period: Period) {
  const invitations = new Map(data.invitations.map((item) => [item.id, item]));
  const kzt = (order: Row) => toKzt(Number(order.amount) || 0, order.currency, rateFor(order, invitations.get(order.invitationId), pricing));

  const payments = data.orders.filter((order) => inPeriod(paidAt(order), period)).sort(byPaidAt);
  const refunds = data.orders
    .filter((order) => inPeriod(refundedAt(order), period))
    .sort((left, right) => (timestamp(refundedAt(left)) || 0) - (timestamp(refundedAt(right)) || 0));

  const totals = new Map<string, CurrencyTotals>();
  const daily = new Map<string, CurrencyTotals & { date: string }>();
  const totalFor = (currency: string) => {
    if (!totals.has(currency)) totals.set(currency, emptyTotals(currency));
    return totals.get(currency) as CurrencyTotals;
  };
  const dayFor = (date: string, currency: string) => {
    const key = `${date}|${currency}`;
    if (!daily.has(key)) daily.set(key, { date, ...emptyTotals(currency) });
    return daily.get(key) as CurrencyTotals & { date: string };
  };

  const kztEquivalent = { payments: 0, refunds: 0, net: 0 };
  for (const order of payments) {
    const amount = Number(order.amount) || 0;
    for (const bucket of [totalFor(order.currency), dayFor(localDay(paidAt(order)) as string, order.currency)]) {
      bucket.paymentsCount += 1;
      bucket.paymentsAmount = roundMoney(bucket.paymentsAmount + amount);
    }
    kztEquivalent.payments += kzt(order);
  }
  for (const order of refunds) {
    const amount = Number(order.amount) || 0;
    for (const bucket of [totalFor(order.currency), dayFor(localDay(refundedAt(order)) as string, order.currency)]) {
      bucket.refundsCount += 1;
      bucket.refundsAmount = roundMoney(bucket.refundsAmount + amount);
    }
    kztEquivalent.refunds += kzt(order);
  }
  for (const bucket of [...totals.values(), ...daily.values()]) {
    bucket.netAmount = roundMoney(bucket.paymentsAmount - bucket.refundsAmount);
  }
  kztEquivalent.net = kztEquivalent.payments - kztEquivalent.refunds;

  const accounting = { new: 0, reconciled: 0, exported: 0, disputed: 0 } as Record<string, number>;
  for (const order of payments) accounting[order.accountingStatus || 'new'] = (accounting[order.accountingStatus || 'new'] || 0) + 1;

  // "Needs attention" is a running list, independent of the selected period.
  const everPaid = data.orders.filter((order) => paidAt(order)).sort(byPaidAt);
  const unreconciled = everPaid.filter((order) => (order.accountingStatus || 'new') === 'new');
  const unreconciledTotals = new Map<string, number>();
  for (const order of unreconciled) {
    unreconciledTotals.set(order.currency, roundMoney((unreconciledTotals.get(order.currency) || 0) + (Number(order.amount) || 0)));
  }
  const brief = (order: Row) => ({
    id: order.id,
    invoiceId: order.invoiceId,
    paidAt: paidAt(order),
    fullName: order.fullName,
    amount: Number(order.amount) || 0,
    currency: order.currency,
    refundStatus: order.refundStatus || 'none',
    refundReason: order.refundReason || '',
    adminComment: order.adminComment || '',
  });

  return {
    period,
    totals: [...totals.values()].sort((left, right) => currencyOrder(left.currency, right.currency)),
    kztEquivalent,
    daily: [...daily.values()].sort((left, right) => left.date.localeCompare(right.date) || currencyOrder(left.currency, right.currency)),
    accounting,
    payments: payments.map((order) => {
      const rate = rateFor(order, invitations.get(order.invitationId), pricing);
      return {
        id: order.id,
        invoiceId: order.invoiceId,
        paidAt: paidAt(order),
        halykReference: order.halykReference || '',
        cardMask: order.cardMask || '',
        fullName: order.fullName,
        email: order.email,
        country: order.country || '',
        residency: order.residency,
        articleTitle: order.articleTitle,
        amount: Number(order.amount) || 0,
        currency: order.currency,
        rate: order.currency === 'KZT' ? null : rate,
        kztEquivalent: kzt(order),
        status: order.status,
        accountingStatus: order.accountingStatus || 'new',
        refundStatus: order.refundStatus || 'none',
        refundedAt: refundedAt(order),
      };
    }),
    refunds: refunds.map((order) => ({
      id: order.id,
      invoiceId: order.invoiceId,
      refundedAt: refundedAt(order),
      paidAt: paidAt(order),
      halykReference: order.halykReference || '',
      fullName: order.fullName,
      email: order.email,
      articleTitle: order.articleTitle,
      amount: Number(order.amount) || 0,
      currency: order.currency,
      kztEquivalent: kzt(order),
      refundReason: order.refundReason || '',
    })),
    attention: {
      unreconciled: {
        count: unreconciled.length,
        totals: [...unreconciledTotals.entries()]
          .map(([currency, amount]) => ({ currency, amount }))
          .sort((left, right) => currencyOrder(left.currency, right.currency)),
        oldestPaidAt: unreconciled.length ? paidAt(unreconciled[0]) : null,
      },
      disputed: everPaid.filter((order) => order.accountingStatus === 'disputed').map(brief),
      refundsInProgress: data.orders
        .filter((order) => order.status === 'paid' && ['requested', 'approved'].includes(order.refundStatus))
        .sort(byPaidAt)
        .map(brief),
    },
  };
}

function monthsBetween(period: Period) {
  const months: string[] = [];
  for (let day = `${period.from.slice(0, 7)}-01`; day.slice(0, 7) <= period.to.slice(0, 7); day = shiftMonths(day, 1)) {
    months.push(day.slice(0, 7));
  }
  return months;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const share = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 1000 : 0);

// Residents without an explicit country pay from Kazakhstan; others stay "unknown" ('').
function countryOf(order: Row, invitation: Row | undefined) {
  const country = String(order.country || invitation?.country || '').trim();
  if (country) return country;
  return order.residency === 'resident_kz' ? 'Kazakhstan' : '';
}

// Aggregates only: nothing in this report identifies an author.
export function buildAnalyticsReport(data: ReportData, pricing: ReportPricing, period: Period, now = Date.now()) {
  const invitations = new Map(data.invitations.map((item) => [item.id, item]));
  const ordersByInvitation = new Map<string, Row[]>();
  for (const order of data.orders) {
    if (!order.invitationId) continue;
    if (!ordersByInvitation.has(order.invitationId)) ordersByInvitation.set(order.invitationId, []);
    (ordersByInvitation.get(order.invitationId) as Row[]).push(order);
  }
  const kzt = (order: Row) => toKzt(Number(order.amount) || 0, order.currency, rateFor(order, invitations.get(order.invitationId), pricing));
  const payments = data.orders.filter((order) => inPeriod(paidAt(order), period));
  const refunds = data.orders.filter((order) => inPeriod(refundedAt(order), period));

  const grossKzt = payments.reduce((sum, order) => sum + kzt(order), 0);
  const refundsKzt = refunds.reduce((sum, order) => sum + kzt(order), 0);

  const months = new Map(monthsBetween(period).map((month) => [month, {
    month,
    linksCreated: 0,
    paidCount: 0,
    grossKzt: 0,
    refundsKzt: 0,
    netKzt: 0,
    averageCheckKzt: 0,
    amounts: {} as Record<string, number>,
  }]));
  for (const order of payments) {
    const month = months.get((localDay(paidAt(order)) as string).slice(0, 7));
    if (!month) continue;
    month.paidCount += 1;
    month.grossKzt += kzt(order);
    month.amounts[order.currency] = roundMoney((month.amounts[order.currency] || 0) + (Number(order.amount) || 0));
  }
  for (const order of refunds) {
    const month = months.get((localDay(refundedAt(order)) as string).slice(0, 7));
    if (month) month.refundsKzt += kzt(order);
  }
  const cohort = data.invitations.filter((invitation) => inPeriod(invitation.createdAt, period));
  for (const invitation of cohort) {
    const month = months.get((localDay(invitation.createdAt) as string).slice(0, 7));
    if (month) month.linksCreated += 1;
  }
  for (const month of months.values()) {
    month.netKzt = month.grossKzt - month.refundsKzt;
    month.averageCheckKzt = month.paidCount ? Math.round(month.grossKzt / month.paidCount) : 0;
  }

  const group = <T extends string>(keyOf: (order: Row) => T) => {
    const groups = new Map<T, { paidCount: number; grossKzt: number; amount: number }>();
    for (const order of payments) {
      const key = keyOf(order);
      const entry = groups.get(key) || { paidCount: 0, grossKzt: 0, amount: 0 };
      entry.paidCount += 1;
      entry.grossKzt += kzt(order);
      entry.amount = roundMoney(entry.amount + (Number(order.amount) || 0));
      groups.set(key, entry);
    }
    return groups;
  };

  const residency = [...group((order) => (order.residency === 'non_resident' ? 'non_resident' : 'resident_kz')).entries()]
    .map(([key, entry]) => ({ residency: key, paidCount: entry.paidCount, grossKzt: entry.grossKzt, share: share(entry.grossKzt, grossKzt) }))
    .sort((left, right) => right.grossKzt - left.grossKzt);
  const currencies = [...group((order) => String(order.currency)).entries()]
    .map(([currency, entry]) => ({ currency, paidCount: entry.paidCount, amount: entry.amount, kztEquivalent: entry.grossKzt }))
    .sort((left, right) => currencyOrder(left.currency, right.currency));

  // Countries are free text from the admin form, so spelling variants are merged case-insensitively.
  const countryNames = new Map<string, string>();
  const countries = [...group((order) => {
    const name = countryOf(order, invitations.get(order.invitationId));
    const key = name.toLocaleLowerCase();
    if (!countryNames.has(key)) countryNames.set(key, name);
    return key;
  }).entries()]
    .map(([key, entry]) => ({ country: countryNames.get(key) || '', paidCount: entry.paidCount, grossKzt: entry.grossKzt, share: share(entry.grossKzt, grossKzt) }))
    .sort((left, right) => right.grossKzt - left.grossKzt || right.paidCount - left.paidCount);

  // Funnel over the links created in the period. Link opens were not tracked before October 2026,
  // so a started payment also counts as an open.
  const funnel = { created: cohort.length, opened: 0, started: 0, paid: 0, cancelled: 0, pending: 0, conversion: 0 };
  for (const invitation of cohort) {
    const orders = ordersByInvitation.get(invitation.id) || [];
    const paid = invitation.status === 'paid' || orders.some((order) => paidAt(order));
    const started = paid || orders.length > 0 || invitation.status === 'payment_started';
    if (started || Number(invitation.openCount) > 0) funnel.opened += 1;
    if (started) funnel.started += 1;
    if (paid) funnel.paid += 1;
    else if (invitation.status === 'cancelled') funnel.cancelled += 1;
    else funnel.pending += 1;
  }
  funnel.conversion = share(funnel.paid, funnel.created);

  const daysToPay = payments
    .map((order) => {
      const created = timestamp(invitations.get(order.invitationId)?.createdAt);
      const paid = timestamp(paidAt(order));
      return created === null || paid === null ? null : Math.max(0, (paid - created) / DAY_MS);
    })
    .filter((value): value is number => value !== null);
  const timeToPay = {
    medianDays: daysToPay.length ? round1(median(daysToPay) as number) : null,
    averageDays: daysToPay.length ? round1(daysToPay.reduce((sum, value) => sum + value, 0) / daysToPay.length) : null,
    buckets: [
      { bucket: '0-1', count: daysToPay.filter((days) => days <= 1).length },
      { bucket: '2-7', count: daysToPay.filter((days) => days > 1 && days <= 7).length },
      { bucket: '8-30', count: daysToPay.filter((days) => days > 7 && days <= 30).length },
      { bucket: '31+', count: daysToPay.filter((days) => days > 30).length },
    ],
  };

  // Individual prices against the standard price frozen on the same link.
  const discounts = { linksCreated: cohort.filter((item) => Number(item.customAmount) > 0).length, paidCount: 0, standardKzt: 0, actualKzt: 0, differenceKzt: 0 };
  for (const order of payments) {
    const invitation = invitations.get(order.invitationId);
    if (!invitation || !(Number(invitation.customAmount) > 0)) continue;
    const rate = Number(invitation.usdToKztRate) || Number(pricing.usdToKztRate) || 0;
    const standard = order.residency === 'non_resident'
      ? toKzt(Number(invitation.nonResidentAmount) || 0, invitation.nonResidentCurrency || 'USD', rate)
      : toKzt(Number(invitation.residentAmount) || 0, invitation.residentCurrency || 'KZT', rate);
    discounts.paidCount += 1;
    discounts.standardKzt += standard;
    discounts.actualKzt += kzt(order);
  }
  discounts.differenceKzt = discounts.standardKzt - discounts.actualKzt;

  // Expected income: links sent but not paid or cancelled, as of now. The residency (and so the
  // currency) is only known once the author starts paying, so the tenge price is the estimate.
  const aging = [
    { bucket: '0-7', maxDays: 7, count: 0, expectedKzt: 0 },
    { bucket: '8-30', maxDays: 30, count: 0, expectedKzt: 0 },
    { bucket: '31-90', maxDays: 90, count: 0, expectedKzt: 0 },
    { bucket: '91+', maxDays: Infinity, count: 0, expectedKzt: 0 },
  ];
  for (const invitation of data.invitations) {
    if (!['created', 'payment_started'].includes(invitation.status)) continue;
    const orders = ordersByInvitation.get(invitation.id) || [];
    if (orders.some((order) => paidAt(order))) continue;
    const created = timestamp(invitation.createdAt);
    if (created === null) continue;
    const rate = Number(invitation.usdToKztRate) || Number(pricing.usdToKztRate) || 0;
    const active = orders.find((order) => ['created', 'token_issued', 'payment_started'].includes(order.status));
    const expected = active
      ? kzt(active)
      : Number(invitation.customAmount) > 0
        ? toKzt(Number(invitation.customAmount), invitation.customCurrency || 'KZT', rate)
        : toKzt(Number(invitation.residentAmount) || 0, 'KZT', rate);
    const age = (now - created) / DAY_MS;
    const bucket = aging.find((item) => age <= item.maxDays) as (typeof aging)[number];
    bucket.count += 1;
    bucket.expectedKzt += expected;
  }

  return {
    period,
    kpi: {
      grossKzt,
      refundsKzt,
      netKzt: grossKzt - refundsKzt,
      paidCount: payments.length,
      refundsCount: refunds.length,
      averageCheckKzt: payments.length ? Math.round(grossKzt / payments.length) : 0,
      linksCreated: cohort.length,
      conversion: funnel.conversion,
      medianDaysToPay: timeToPay.medianDays,
      refundRate: share(refunds.length, payments.length),
    },
    monthly: [...months.values()],
    residency,
    currencies,
    countries,
    funnel,
    timeToPay,
    discounts,
    pipeline: {
      count: aging.reduce((sum, item) => sum + item.count, 0),
      expectedKzt: aging.reduce((sum, item) => sum + item.expectedKzt, 0),
      aging: aging.map(({ bucket, count, expectedKzt }) => ({ bucket, count, expectedKzt })),
    },
    pricing: {
      residentKztAmount: pricing.residentKztAmount ?? null,
      nonResidentAmount: pricing.nonResidentAmount ?? null,
      usdToKztRate: pricing.usdToKztRate,
      baseCurrency: pricing.baseCurrency || 'KZT',
      rateMode: pricing.rateMode || 'manual',
      rateDate: pricing.rateDate || null,
    },
  };
}

export const REPORT_EXPORTS = {
  payments: 'finance',
  refunds: 'finance',
  daily: 'finance',
  monthly: 'analytics',
  countries: 'analytics',
} as const;

export type ReportExport = keyof typeof REPORT_EXPORTS;

// Own keys only: "__proto__" or "constructor" from the query string must not resolve to a report.
export function isReportExport(name: unknown): name is ReportExport {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(REPORT_EXPORTS, name);
}

type Column = [header: Record<'ru' | 'kk' | 'en', string>, value: (row: Row) => unknown];

const h = (ru: string, kk: string, en: string) => ({ ru, kk, en });

const RESIDENCY = { resident_kz: h('Резидент РК', 'ҚР резиденті', 'Resident'), non_resident: h('Нерезидент', 'Бейрезидент', 'Non-resident') };

const EXPORT_COLUMNS: Record<ReportExport, Column[]> = {
  payments: [
    [h('Дата оплаты', 'Төлем күні', 'Paid at'), (row) => localDateTime(row.paidAt)],
    [h('Инвойс', 'Инвойс', 'Invoice'), (row) => row.invoiceId],
    [h('Референс Halyk', 'Halyk референсі', 'Halyk reference'), (row) => row.halykReference],
    [h('Карта', 'Карта', 'Card'), (row) => row.cardMask],
    [h('Плательщик', 'Төлеуші', 'Payer'), (row) => row.fullName],
    [h('Email', 'Email', 'Email'), (row) => row.email],
    [h('Страна', 'Ел', 'Country'), (row) => row.country],
    [h('Резидентство', 'Резиденттік', 'Residency'), (row) => row.residency],
    [h('Статья', 'Мақала', 'Article'), (row) => row.articleTitle],
    [h('Сумма', 'Сома', 'Amount'), (row) => row.amount],
    [h('Валюта', 'Валюта', 'Currency'), (row) => row.currency],
    [h('Курс USD/KZT', 'USD/KZT бағамы', 'USD/KZT rate'), (row) => row.rate ?? ''],
    [h('Эквивалент, KZT', 'Баламасы, KZT', 'KZT equivalent'), (row) => row.kztEquivalent],
    [h('Статус', 'Мәртебе', 'Status'), (row) => row.status],
    [h('Бухгалтерский статус', 'Бухгалтерлік мәртебе', 'Accounting status'), (row) => row.accountingStatus],
    [h('Дата возврата', 'Қайтару күні', 'Refunded at'), (row) => localDateTime(row.refundedAt)],
  ],
  refunds: [
    [h('Дата возврата', 'Қайтару күні', 'Refunded at'), (row) => localDateTime(row.refundedAt)],
    [h('Дата оплаты', 'Төлем күні', 'Paid at'), (row) => localDateTime(row.paidAt)],
    [h('Инвойс', 'Инвойс', 'Invoice'), (row) => row.invoiceId],
    [h('Референс Halyk', 'Halyk референсі', 'Halyk reference'), (row) => row.halykReference],
    [h('Плательщик', 'Төлеуші', 'Payer'), (row) => row.fullName],
    [h('Email', 'Email', 'Email'), (row) => row.email],
    [h('Статья', 'Мақала', 'Article'), (row) => row.articleTitle],
    [h('Сумма', 'Сома', 'Amount'), (row) => row.amount],
    [h('Валюта', 'Валюта', 'Currency'), (row) => row.currency],
    [h('Эквивалент, KZT', 'Баламасы, KZT', 'KZT equivalent'), (row) => row.kztEquivalent],
    [h('Причина', 'Себебі', 'Reason'), (row) => row.refundReason],
  ],
  daily: [
    [h('Дата', 'Күні', 'Date'), (row) => row.date],
    [h('Валюта', 'Валюта', 'Currency'), (row) => row.currency],
    [h('Оплат', 'Төлемдер', 'Payments'), (row) => row.paymentsCount],
    [h('Поступило', 'Түсті', 'Received'), (row) => row.paymentsAmount],
    [h('Возвратов', 'Қайтарулар', 'Refunds'), (row) => row.refundsCount],
    [h('Возвращено', 'Қайтарылды', 'Refunded'), (row) => row.refundsAmount],
    [h('Итого', 'Барлығы', 'Net'), (row) => row.netAmount],
  ],
  monthly: [
    [h('Месяц', 'Ай', 'Month'), (row) => row.month],
    [h('Создано ссылок', 'Жасалған сілтемелер', 'Links created'), (row) => row.linksCreated],
    [h('Оплачено статей', 'Төленген мақалалар', 'Articles paid'), (row) => row.paidCount],
    [h('Поступления, KZT-экв.', 'Түсімдер, KZT-бал.', 'Gross, KZT eq.'), (row) => row.grossKzt],
    [h('Возвраты, KZT-экв.', 'Қайтарулар, KZT-бал.', 'Refunds, KZT eq.'), (row) => row.refundsKzt],
    [h('Чистая выручка, KZT-экв.', 'Таза түсім, KZT-бал.', 'Net, KZT eq.'), (row) => row.netKzt],
    [h('Средний чек, KZT-экв.', 'Орташа чек, KZT-бал.', 'Average check, KZT eq.'), (row) => row.averageCheckKzt],
    [h('Получено KZT', 'Алынған KZT', 'Received KZT'), (row) => row.amounts?.KZT || 0],
    [h('Получено USD', 'Алынған USD', 'Received USD'), (row) => row.amounts?.USD || 0],
  ],
  countries: [
    [h('Страна', 'Ел', 'Country'), (row) => row.country || '—'],
    [h('Оплачено статей', 'Төленген мақалалар', 'Articles paid'), (row) => row.paidCount],
    [h('Поступления, KZT-экв.', 'Түсімдер, KZT-бал.', 'Gross, KZT eq.'), (row) => row.grossKzt],
    [h('Доля, %', 'Үлесі, %', 'Share, %'), (row) => Math.round((row.share || 0) * 1000) / 10],
  ],
};

// Excel in Kazakhstan/Russia expects ";" between cells and a decimal comma. Text that starts
// like a formula is prefixed so author-supplied names cannot run as formulas.
function csvCell(value: unknown) {
  if (typeof value === 'number') return String(value).replace('.', ',');
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.split('"').join('""')}"` : text;
}

export function exportRows(name: ReportExport, finance: ReturnType<typeof buildFinanceReport> | null, analytics: ReturnType<typeof buildAnalyticsReport> | null): Row[] {
  if (name === 'payments') return finance?.payments || [];
  if (name === 'refunds') return finance?.refunds || [];
  if (name === 'daily') return finance?.daily || [];
  if (name === 'monthly') return analytics?.monthly || [];
  return analytics?.countries || [];
}

export function reportCsv(name: ReportExport, rows: Row[], lang: unknown = 'ru') {
  const language = lang === 'en' || lang === 'kk' ? lang : 'ru';
  const columns = EXPORT_COLUMNS[name];
  const residencyLabel = (value: unknown) => RESIDENCY[value as keyof typeof RESIDENCY]?.[language] ?? String(value ?? '');
  const lines = [columns.map(([header]) => csvCell(header[language])).join(';')];
  for (const row of rows) {
    const prepared = name === 'payments' ? { ...row, residency: residencyLabel(row.residency) } : row;
    lines.push(columns.map(([, value]) => csvCell(value(prepared))).join(';'));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}
