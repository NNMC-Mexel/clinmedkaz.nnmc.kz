const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const serverDir = path.resolve(__dirname, '..');
const port = 14800 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}/api`;
const databaseName = `e2e-${process.pid}.db`;
const databasePath = path.join(serverDir, '.tmp', databaseName);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(child, logs) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Strapi exited before becoming ready.\n${logs.join('')}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error(`Timed out waiting for Strapi.\n${logs.join('')}`);
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function seedUser(roleType, username, password) {
  const db = new Database(databasePath);
  const role = db.prepare('select id from up_roles where type = ?').get(roleType);
  assert.ok(role, `Role ${roleType} must exist`);
  const timestamp = new Date().toISOString();
  const result = db.prepare(`
    insert into up_users
      (document_id, username, email, provider, password, confirmed, blocked, created_at, updated_at, published_at)
    values (?, ?, ?, 'local', ?, 1, 0, ?, ?, ?)
  `).run(crypto.randomUUID(), username, `${username}@example.test`, bcrypt.hashSync(password, 10), timestamp, timestamp, timestamp);
  db.prepare('insert into up_users_role_lnk (user_id, role_id, user_ord) values (?, ?, 1)').run(result.lastInsertRowid, role.id);
  db.close();
}

async function login(identifier, password) {
  const result = await request('/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.ok(result.body.jwt);
  return result.body.jwt;
}

test('critical payment API journey, authorization and concurrency', { timeout: 150_000 }, async (t) => {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const logs = [];
  const child = spawn(process.execPath, [path.join(serverDir, 'node_modules/@strapi/strapi/bin/strapi.js'), 'start'], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_CLIENT: 'sqlite',
      DATABASE_FILENAME: `.tmp/${databaseName}`,
      APP_KEYS: 'e2e-app-key-one,e2e-app-key-two,e2e-app-key-three,e2e-app-key-four',
      API_TOKEN_SALT: 'e2e-api-token-salt-secure',
      ADMIN_JWT_SECRET: 'e2e-admin-jwt-secret-secure',
      TRANSFER_TOKEN_SALT: 'e2e-transfer-token-salt-secure',
      ENCRYPTION_KEY: 'e2e-encryption-key-secure',
      JWT_SECRET: 'e2e-users-jwt-secret-secure',
      BASE_URL: `http://127.0.0.1:${port}`,
      BACKEND_URL: `http://127.0.0.1:${port}`,
      CORS_ORIGINS: `http://127.0.0.1:${port}`,
      HALYK_ENV: 'test',
      HALYK_CLIENT_ID: 'e2e-client',
      HALYK_CLIENT_SECRET: 'e2e-client-secret',
      HALYK_TERMINAL_ID: 'e2e-terminal',
      HALYK_STATUS_SYNC_ENABLED: 'false',
      PAYMENT_RECONCILIATION_CRON_ENABLED: 'false',
      CRON_ENABLED: 'false',
      PAYMENT_ADMIN_USERS: 'e2e-admin',
      PUBLICATION_FEE_KZT: '145620',
      USD_TO_KZT_RATE: '485.4',
      STRAPI_TELEMETRY_DISABLED: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));

  t.after(async () => {
    if (child.exitCode === null) child.kill('SIGTERM');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(10_000)]);
    for (const suffix of ['', '-shm', '-wal']) {
      try { fs.unlinkSync(`${databasePath}${suffix}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  });

  await waitForServer(child, logs);

  const health = await request('/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.body.status, 'ok');
  assert.match(health.response.headers.get('x-request-id') || '', /^[a-zA-Z0-9_-]{8,100}$/);
  assert.equal(health.response.headers.get('x-powered-by'), null);

  const ready = await request('/ready');
  assert.equal(ready.response.status, 200, JSON.stringify(ready.body));
  assert.deepEqual(ready.body.checks, { database: true, paymentProvider: true, reconciliation: true });

  const registration = await request('/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'public-user', email: 'public@example.test', password: 'Secure-12345' }),
  });
  assert.ok(registration.response.status >= 400, 'Public registration must be disabled');

  seedUser('payment-admin', 'e2e-admin', 'Admin-Password-123');
  seedUser('authenticated', 'e2e-user', 'User-Password-123');
  const adminJwt = await login('e2e-admin', 'Admin-Password-123');
  const userJwt = await login('e2e-user', 'User-Password-123');

  const forbidden = await request('/admin/session', { headers: { authorization: `Bearer ${userJwt}` } });
  assert.equal(forbidden.response.status, 403);
  const session = await request('/admin/session', { headers: { authorization: `Bearer ${adminJwt}` } });
  assert.equal(session.response.status, 200);
  assert.equal(session.body.authenticated, true);

  const invalidInvitation = await request('/invitations', {
    method: 'POST',
    headers: { authorization: `Bearer ${adminJwt}` },
    body: JSON.stringify({ email: 'invalid', articleTitle: 'A' }),
  });
  assert.equal(invalidInvitation.response.status, 400);
  assert.equal(invalidInvitation.body.error.name, 'ValidationError');

  const invitationResponse = await request('/invitations', {
    method: 'POST',
    headers: { authorization: `Bearer ${adminJwt}` },
    body: JSON.stringify({
      email: 'author@example.test',
      fullName: 'Test Author',
      phone: '+7 (777) 123-45-67',
      articleTitle: 'E2E atomic payment article',
      lang: 'ru',
      sendEmail: false,
    }),
  });
  assert.equal(invitationResponse.response.status, 200, JSON.stringify(invitationResponse.body));
  assert.equal(invitationResponse.body.invitation.phone, '77771234567');
  const invitationId = invitationResponse.body.invitation.id;

  const paymentBody = JSON.stringify({
    invitationId,
    fullName: 'Test Author',
    email: 'author@example.test',
    phone: '77771234567',
    lang: 'ru',
    residency: 'resident_kz',
  });
  const parallelPayments = await Promise.all(Array.from({ length: 8 }, () => request('/payments', { method: 'POST', body: paymentBody })));
  for (const result of parallelPayments) assert.equal(result.response.status, 200, JSON.stringify(result.body));
  const payUrls = new Set(parallelPayments.map((result) => result.body.payUrl));
  assert.equal(payUrls.size, 1, 'Concurrent requests must reuse one active order');

  const ordersPage = await request(`/admin/orders?page=1&pageSize=1&query=${encodeURIComponent('atomic payment')}`, {
    headers: { authorization: `Bearer ${adminJwt}` },
  });
  assert.equal(ordersPage.response.status, 200, JSON.stringify(ordersPage.body));
  assert.equal(ordersPage.body.pagination.total, 1);
  assert.equal(ordersPage.body.orders.length, 1);
  assert.equal(ordersPage.body.orders[0].secretHash, undefined);
  const order = ordersPage.body.orders[0];

  const db = new Database(databasePath);
  const storedOrder = db.prepare('select secret_hash from payment_orders where external_id = ?').get(order.id);
  db.close();
  assert.ok(storedOrder.secret_hash);

  const callbackPayload = {
    invoiceId: order.invoiceId,
    secret_hash: storedOrder.secret_hash,
    amount: order.amount,
    currency: order.currency,
    terminalID: 'e2e-terminal',
    code: 'ok',
    reference: 'e2e-reference',
    cardMask: '411111******1111',
    ignoredSecret: 'must-not-be-stored',
  };
  const callback = await request('/halyk/postlink', { method: 'POST', body: JSON.stringify(callbackPayload) });
  assert.equal(callback.response.status, 200, JSON.stringify(callback.body));

  const paidPage = await request(`/admin/orders?query=${encodeURIComponent(order.invoiceId)}`, {
    headers: { authorization: `Bearer ${adminJwt}` },
  });
  assert.equal(paidPage.body.orders[0].status, 'paid');
  assert.equal(paidPage.body.orders[0].publicationStatus, 'ready_to_publish');

  const verificationDb = new Database(databasePath, { readonly: true });
  const orderCount = verificationDb.prepare('select count(*) as count from payment_orders where invitation_id = ?').get(invitationId).count;
  const storedCallback = verificationDb.prepare('select payload from payment_callbacks order by id desc limit 1').get();
  verificationDb.close();
  assert.equal(orderCount, 1);
  assert.doesNotMatch(String(storedCallback.payload), /secret|must-not-be-stored/i);
  assert.doesNotMatch(logs.join(''), new RegExp(storedOrder.secret_hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  let limited = null;
  for (let index = 0; index < 10; index += 1) {
    limited = await request('/auth/local', { method: 'POST', body: JSON.stringify({ identifier: 'unknown', password: 'wrong' }) });
  }
  assert.equal(limited.response.status, 429);
  assert.ok(Number(limited.response.headers.get('retry-after')) >= 1);
});
