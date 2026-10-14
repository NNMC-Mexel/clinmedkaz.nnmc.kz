const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildAnalyticsReport,
  buildFinanceReport,
  localDay,
  reportCsv,
  resolvePeriod,
} = require('../dist/src/lib/reports.js');
const { PAYMENT_ROLES, ROLE_CAPABILITIES, forbiddenOrderFields, roleFromType } = require('../dist/src/lib/roles.js');
const { refundPatchError } = require('../dist/src/lib/domain.js');
const { isReportExport } = require('../dist/src/lib/reports.js');

const pricing = { usdToKztRate: 500, residentKztAmount: 150000, nonResidentAmount: 300, baseCurrency: 'KZT', rateMode: 'manual', rateDate: null };

function invitation(id, overrides = {}) {
  return {
    id,
    status: 'paid',
    createdAt: '2026-09-01T04:00:00.000Z',
    usdToKztRate: 480,
    residentAmount: 144000,
    residentCurrency: 'KZT',
    nonResidentAmount: 300,
    nonResidentCurrency: 'USD',
    customAmount: null,
    customCurrency: '',
    country: '',
    openCount: 1,
    ...overrides,
  };
}

function order(id, overrides = {}) {
  return {
    id,
    invitationId: `inv_${id}`,
    invoiceId: `inv-${id}`,
    status: 'paid',
    amount: 144000,
    currency: 'KZT',
    exchangeRate: 480,
    residency: 'resident_kz',
    fullName: `Author ${id}`,
    email: `${id}@example.test`,
    country: '',
    articleTitle: `Article ${id}`,
    paymentReceivedAt: '2026-10-05T06:00:00.000Z',
    accountingStatus: 'new',
    refundStatus: 'none',
    createdAt: '2026-10-01T06:00:00.000Z',
    updatedAt: '2026-10-05T06:00:00.000Z',
    ...overrides,
  };
}

function dataset() {
  const orders = [
    order('a'),
    order('b', { amount: 300, currency: 'USD', exchangeRate: null, residency: 'non_resident', country: 'India', accountingStatus: 'reconciled' }),
    // Paid in September, refunded in October: the refund belongs to October, the payment does not.
    order('c', { paymentReceivedAt: '2026-09-20T06:00:00.000Z', status: 'refunded', refundStatus: 'processed', refundedAt: '2026-10-07T06:00:00.000Z', refundReason: 'Duplicate' }),
    // 20:30 UTC on Oct 31 is already November 1 in Astana.
    order('d', { paymentReceivedAt: '2026-10-31T20:30:00.000Z' }),
    order('e', { status: 'failed', paymentReceivedAt: null }),
    order('f', { refundStatus: 'requested', accountingStatus: 'disputed', paymentReceivedAt: '2026-10-06T06:00:00.000Z' }),
  ];
  const invitations = [
    invitation('inv_a'),
    invitation('inv_b', { usdToKztRate: 490, country: 'India' }),
    invitation('inv_c'),
    invitation('inv_d'),
    invitation('inv_e', { status: 'payment_started', createdAt: '2026-10-02T04:00:00.000Z', openCount: 0 }),
    invitation('inv_f', { customAmount: 100000, customCurrency: 'KZT' }),
    invitation('inv_g', { status: 'created', createdAt: '2026-10-10T04:00:00.000Z', openCount: 0 }),
    invitation('inv_h', { status: 'cancelled', createdAt: '2026-10-11T04:00:00.000Z', openCount: 2 }),
  ];
  orders[5].amount = 100000;
  return { orders, invitations };
}

const october = { from: '2026-10-01', to: '2026-10-31' };

test('report days follow Astana time (UTC+5)', () => {
  assert.equal(localDay('2026-10-31T18:59:00.000Z'), '2026-10-31');
  assert.equal(localDay('2026-10-31T19:00:00.000Z'), '2026-11-01');
  assert.equal(localDay(null), null);
});

test('periods default to the current month or the last N months and reject bad input', () => {
  const now = Date.parse('2026-10-13T10:00:00.000Z');
  assert.deepEqual(resolvePeriod({}, now), { from: '2026-10-01', to: '2026-10-13' });
  assert.deepEqual(resolvePeriod({}, now, 12), { from: '2025-11-01', to: '2026-10-13' });
  assert.deepEqual(resolvePeriod({ from: '2026-01-01', to: '2026-03-31' }, now), { from: '2026-01-01', to: '2026-03-31' });
  assert.throws(() => resolvePeriod({ from: '2026-02-30' }, now), /YYYY-MM-DD/);
  assert.throws(() => resolvePeriod({ from: '2026-05-01', to: '2026-04-01' }, now), /after its end/);
  assert.throws(() => resolvePeriod({ from: '2020-01-01', to: '2026-01-01' }, now), /three years/);
});

test('finance report splits payments and refunds by their own dates and currencies', () => {
  const report = buildFinanceReport(dataset(), pricing, october);
  assert.deepEqual(report.payments.map((row) => row.id), ['a', 'b', 'f']);
  assert.deepEqual(report.refunds.map((row) => row.id), ['c']);
  const kzt = report.totals.find((row) => row.currency === 'KZT');
  assert.deepEqual(kzt, { currency: 'KZT', paymentsCount: 2, paymentsAmount: 244000, refundsCount: 1, refundsAmount: 144000, netAmount: 100000 });
  const usd = report.totals.find((row) => row.currency === 'USD');
  assert.equal(usd.paymentsAmount, 300);
  // USD converts at the rate frozen on the link (490), not today's price rate (500).
  assert.equal(report.payments.find((row) => row.id === 'b').kztEquivalent, 147000);
  assert.deepEqual(report.kztEquivalent, { payments: 391000, refunds: 144000, net: 247000 });
  assert.deepEqual(report.daily.map((row) => `${row.date}:${row.currency}`), ['2026-10-05:KZT', '2026-10-05:USD', '2026-10-06:KZT', '2026-10-07:KZT']);
  assert.deepEqual(report.accounting, { new: 1, reconciled: 1, exported: 0, disputed: 1 });
});

test('finance attention lists are independent of the period', () => {
  const report = buildFinanceReport(dataset(), pricing, { from: '2026-01-01', to: '2026-01-31' });
  assert.equal(report.payments.length, 0);
  assert.equal(report.attention.unreconciled.count, 3, 'a, c and d are still "new"');
  assert.deepEqual(report.attention.disputed.map((row) => row.id), ['f']);
  assert.deepEqual(report.attention.refundsInProgress.map((row) => row.id), ['f']);
});

test('analytics report has aggregates only and the expected funnel', () => {
  const now = Date.parse('2026-10-13T10:00:00.000Z');
  const report = buildAnalyticsReport(dataset(), pricing, october, now);
  const text = JSON.stringify(report);
  assert.doesNotMatch(text, /@example\.test|Author |Article /, 'No personal data in analytics');
  assert.equal(report.kpi.paidCount, 3);
  assert.equal(report.kpi.grossKzt, 391000);
  assert.equal(report.kpi.netKzt, 247000);
  assert.equal(report.monthly.length, 1);
  assert.equal(report.monthly[0].month, '2026-10');
  assert.deepEqual(report.funnel, { created: 3, opened: 2, started: 1, paid: 0, cancelled: 1, pending: 2, conversion: 0 });
  assert.deepEqual(report.residency.map((row) => row.residency), ['resident_kz', 'non_resident']);
  assert.deepEqual(report.countries.map((row) => row.country), ['Kazakhstan', 'India']);
  assert.equal(report.discounts.paidCount, 1);
  assert.equal(report.discounts.differenceKzt, 44000);
  assert.equal(report.pipeline.count, 2, 'Unpaid, uncancelled links e and g');
  assert.equal(report.pipeline.expectedKzt, 288000);
});

test('CSV exports use semicolons, decimal commas and neutralise formulas', () => {
  const csv = reportCsv('payments', [{
    paidAt: '2026-10-05T06:00:00.000Z',
    invoiceId: '1',
    fullName: '=HYPERLINK("http://x")',
    residency: 'non_resident',
    amount: 125.5,
    currency: 'USD',
    rate: 490,
    kztEquivalent: 61495,
  }], 'ru');
  assert.ok(csv.startsWith('﻿Дата оплаты;Инвойс;'));
  const line = csv.split('\r\n')[1];
  assert.match(line, /^2026-10-05 11:00;1;/);
  assert.match(line, /;"'=HYPERLINK\(""http:\/\/x""\)";/);
  assert.match(line, /;Нерезидент;/);
  assert.match(line, /;125,5;USD;490;61495;/);
});

test('roles map to Strapi role types and limit what each can change', () => {
  assert.equal(roleFromType('payment-admin'), 'admin');
  assert.equal(roleFromType('payment-accountant'), 'accountant');
  assert.equal(roleFromType('payment-economist'), 'economist');
  assert.equal(roleFromType('authenticated'), null);
  assert.deepEqual(forbiddenOrderFields('admin', { publicationStatus: 'published', accountingStatus: 'exported' }), []);
  assert.deepEqual(forbiddenOrderFields('accountant', { accountingStatus: 'reconciled', refundStatus: 'processed', adminComment: 'ok' }), []);
  assert.deepEqual(forbiddenOrderFields('accountant', { publicationStatus: 'published', publishedAt: true }), ['publicationStatus', 'publishedAt']);
  assert.deepEqual(forbiddenOrderFields('economist', { accountingStatus: 'reconciled' }), ['accountingStatus']);
  assert.ok(!PAYMENT_ROLES.economist.actions.some((action) => /orders|receipt|exportCsv|invitation/.test(action)), 'Economists never reach personal data');
  assert.equal(ROLE_CAPABILITIES.accountant.createLinks, false);
  assert.equal(ROLE_CAPABILITIES.economist.analyticsReports, true);
});

test('report export names are own keys only', () => {
  assert.equal(isReportExport('payments'), true);
  for (const name of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', '', undefined]) assert.equal(isReportExport(name), false, String(name));
});

test('refund status follows the money: only paid orders, and a processed refund is final', () => {
  assert.equal(refundPatchError({ status: 'paid', refundStatus: 'none' }, { refundStatus: 'processed', refundReason: 'Duplicate payment' }), null);
  assert.equal(refundPatchError({ status: 'paid', refundStatus: 'requested', refundReason: 'Withdrawn' }, { refundStatus: 'processed' }), null, 'The stored reason counts');
  assert.match(refundPatchError({ status: 'paid', refundStatus: 'none' }, { refundStatus: 'processed' }), /reason is required/);
  assert.match(refundPatchError({ status: 'paid', refundStatus: 'none' }, { refundStatus: 'requested', refundReason: '   ' }), /reason is required/);
  assert.equal(refundPatchError({ status: 'paid', refundStatus: 'requested' }, { refundStatus: 'none' }), null);
  assert.equal(refundPatchError({ status: 'paid', refundStatus: 'requested' }, { refundStatus: 'rejected' }), null, 'Rejecting needs no reason');
  assert.match(refundPatchError({ status: 'failed', refundStatus: 'none' }, { refundStatus: 'processed' }), /paid order/);
  assert.match(refundPatchError({ status: 'token_issued', refundStatus: 'none' }, { refundStatus: 'requested' }), /paid order/);
  assert.match(refundPatchError({ status: 'refunded', refundStatus: 'processed' }, { refundStatus: 'none' }), /already processed/);
  assert.equal(refundPatchError({ status: 'refunded', refundStatus: 'processed' }, { refundStatus: 'processed', refundReason: 'x' }), null, 'Unchanged status with a new reason is fine');
  assert.equal(refundPatchError({ status: 'failed' }, { accountingStatus: 'reconciled' }), null);
});
