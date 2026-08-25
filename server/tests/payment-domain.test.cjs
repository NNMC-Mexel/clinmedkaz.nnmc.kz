const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateHalykTransaction,
  evaluatePostlink,
  sanitizePostlinkPayload,
  validateInvitationInput,
} = require('../dist/src/lib/domain.js');
const { buildPaymentEmails } = require('../dist/src/lib/payment-emails.js');
const { productionConfigurationErrors, config } = require('../dist/src/lib/config.js');
const { postLinkUrl } = require('../dist/src/lib/halyk.js');
const { redactMeta } = require('../dist/src/lib/logger.js');
const { createRateLimiter } = require('../dist/src/lib/rate-limit.js');

const order = {
  invoiceId: '123456789',
  secretHash: 'order-secret',
  amount: 145620,
  currency: 'KZT',
  lang: 'kk',
  email: 'author@example.test',
  articleTitle: '<img src=x onerror=alert(1)>',
};

test('postlink accepts only exact secret, amount, currency and terminal', () => {
  const decision = evaluatePostlink(order, {
    invoiceId: order.invoiceId,
    secret_hash: order.secretHash,
    amount: order.amount,
    currency: order.currency,
    terminalID: 'terminal-1',
    code: 'ok',
  }, 'terminal-1');
  assert.equal(decision.action, 'paid');
});

test('postlink rejects missing amount', () => {
  const decision = evaluatePostlink(order, {
    secret_hash: order.secretHash,
    currency: order.currency,
    terminalID: 'terminal-1',
    code: 'ok',
  }, 'terminal-1');
  assert.equal(decision.action, 'reject_amount');
  assert.equal(decision.amount.checked, false);
});

test('postlink rejects missing currency', () => {
  const decision = evaluatePostlink(order, {
    secret_hash: order.secretHash,
    amount: order.amount,
    terminalID: 'terminal-1',
    code: 'ok',
  }, 'terminal-1');
  assert.equal(decision.action, 'reject_amount');
});

test('postlink rejects another terminal', () => {
  const decision = evaluatePostlink(order, {
    secret_hash: order.secretHash,
    amount: order.amount,
    currency: order.currency,
    terminalID: 'terminal-2',
    code: 'ok',
  }, 'terminal-1');
  assert.equal(decision.action, 'reject_terminal');
});

test('Halyk reconciliation accepts CHARGE with matching financial fields', () => {
  const decision = evaluateHalykTransaction(order, {
    resultCode: '100',
    transaction: {
      invoiceID: order.invoiceId,
      amount: order.amount,
      currency: order.currency,
      terminalID: 'terminal-1',
      statusName: 'CHARGE',
    },
  }, 'terminal-1');
  assert.equal(decision.action, 'paid');
});

test('Halyk reconciliation keeps non-final status pending', () => {
  const decision = evaluateHalykTransaction(order, {
    resultCode: '100',
    transaction: {
      invoiceID: order.invoiceId,
      amount: order.amount,
      currency: order.currency,
      terminalID: 'terminal-1',
      statusName: 'NEW',
    },
  }, 'terminal-1');
  assert.equal(decision.action, 'pending');
});

test('Halyk reconciliation rejects mismatched amount or currency', () => {
  const decision = evaluateHalykTransaction(order, {
    resultCode: '100',
    transaction: {
      invoiceID: order.invoiceId,
      amount: 1,
      currency: 'USD',
      terminalID: 'terminal-1',
      statusName: 'CHARGE',
    },
  }, 'terminal-1');
  assert.equal(decision.action, 'reject');
  assert.equal(decision.reason, 'amount_or_currency_mismatch');
});

test('payment receipt uses order language and escapes user HTML', () => {
  const emails = buildPaymentEmails(order, { reference: '<b>unsafe</b>' });
  assert.match(emails.payer.subject, /төлем/iu);
  assert.doesNotMatch(emails.payer.html, /<img src=x/iu);
  assert.match(emails.payer.html, /&lt;img src=x/iu);
  assert.doesNotMatch(emails.admin.html, /<b>unsafe<\/b>/iu);
});

test('expected validation failures use a Strapi application error', () => {
  assert.throws(
    () => validateInvitationInput({ email: 'author@example.test', articleTitle: 'x' }),
    (error) => error?.name === 'ValidationError' && error?.message === 'Article title is required.'
  );
});

test('postlink audit payload never persists order secrets or unknown fields', () => {
  const payload = sanitizePostlinkPayload({
    invoiceId: '123',
    secret_hash: 'do-not-store',
    amount: 42,
    password: 'also-secret',
    arbitrary: '<script>alert(1)</script>',
  });
  assert.deepEqual(payload, { invoiceId: '123', amount: 42 });
});

test('postlink URL contains no global secret in its query string', () => {
  const url = new URL(postLinkUrl());
  assert.equal(url.pathname, '/api/halyk/postlink');
  assert.equal(url.search, '');
});

test('production guard rejects test provider, HTTP and SQLite', () => {
  const unsafe = structuredClone(config);
  unsafe.halyk.env = 'test';
  unsafe.baseUrl = 'http://localhost:5173';
  unsafe.backendUrl = 'http://localhost:1337';
  unsafe.runtime.databaseClient = 'sqlite';
  unsafe.runtime.databaseConfigured = false;
  const errors = productionConfigurationErrors(unsafe);
  assert.ok(errors.some((message) => message.includes('HALYK_ENV')));
  assert.ok(errors.some((message) => message.includes('HTTPS')));
  assert.ok(errors.some((message) => message.includes('PostgreSQL')));
});

test('production guard permits intentionally disabled payments without Halyk credentials', () => {
  const degraded = structuredClone(config);
  degraded.payments.enabled = false;
  degraded.halyk.env = 'test';
  degraded.halyk.clientId = '';
  degraded.halyk.clientSecret = '';
  degraded.halyk.terminalId = '';
  degraded.halyk.statusSyncEnabled = false;
  degraded.halyk.reconciliationCronEnabled = false;
  degraded.paymentAdmin.usernames = [];
  degraded.paymentAdmin.emails = [];
  degraded.baseUrl = 'https://clinmedkaz.example.test';
  degraded.backendUrl = 'https://api.clinmedkaz.example.test';
  degraded.smtp = { host: 'smtp.example.test', port: 465, secure: true, user: 'mailer', pass: 'strong-mail-password', from: 'ClinMedKaz <mailer@example.test>' };
  degraded.runtime.databaseClient = 'postgres';
  degraded.runtime.databaseConfigured = true;
  degraded.runtime.corsOrigins = ['https://clinmedkaz.example.test'];
  degraded.runtime.appKeys = ['strong-app-key-one', 'strong-app-key-two'];
  degraded.runtime.adminJwtSecret = 'strong-admin-jwt-secret';
  degraded.runtime.apiTokenSalt = 'strong-api-token-salt';
  degraded.runtime.transferTokenSalt = 'strong-transfer-token-salt';
  degraded.runtime.encryptionKey = 'strong-encryption-key';
  degraded.runtime.usersPermissionsJwtSecret = 'strong-users-jwt-secret';
  const errors = productionConfigurationErrors(degraded);
  assert.deepEqual(errors, []);
});

test('logger redacts nested credentials', () => {
  assert.deepEqual(redactMeta({ token: 'abc', nested: { password: 'xyz', safe: 7 } }), {
    token: '[REDACTED]',
    nested: { password: '[REDACTED]', safe: 7 },
  });
});

test('rate limiter blocks requests over the configured window and resets', () => {
  let timestamp = 1_000;
  const limiter = createRateLimiter(() => timestamp);
  assert.equal(limiter.check('login:ip', 2, 60_000).allowed, true);
  assert.equal(limiter.check('login:ip', 2, 60_000).allowed, true);
  assert.equal(limiter.check('login:ip', 2, 60_000).allowed, false);
  timestamp += 60_001;
  assert.equal(limiter.check('login:ip', 2, 60_000).allowed, true);
});
