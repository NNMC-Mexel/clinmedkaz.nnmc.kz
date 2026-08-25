const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const serverDir = path.resolve(__dirname, '..');
const port = 15400 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}/api`;
const databaseName = `degraded-${process.pid}.db`;
const databasePath = path.join(serverDir, '.tmp', databaseName);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  throw new Error(`Timed out waiting for degraded Strapi.\n${logs.join('')}`);
}

test('degraded mode keeps the site ready and blocks payment operations', { timeout: 120_000 }, async (t) => {
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
      APP_KEYS: 'degraded-key-one,degraded-key-two,degraded-key-three,degraded-key-four',
      API_TOKEN_SALT: 'degraded-api-token-salt',
      ADMIN_JWT_SECRET: 'degraded-admin-jwt-secret',
      TRANSFER_TOKEN_SALT: 'degraded-transfer-token-salt',
      ENCRYPTION_KEY: 'degraded-encryption-key',
      JWT_SECRET: 'degraded-users-jwt-secret',
      BASE_URL: `http://127.0.0.1:${port}`,
      BACKEND_URL: `http://127.0.0.1:${port}`,
      CORS_ORIGINS: `http://127.0.0.1:${port}`,
      PAYMENTS_ENABLED: 'false',
      HALYK_CLIENT_ID: '',
      HALYK_CLIENT_SECRET: '',
      HALYK_TERMINAL_ID: '',
      HALYK_STATUS_SYNC_ENABLED: 'false',
      PAYMENT_RECONCILIATION_CRON_ENABLED: 'false',
      CRON_ENABLED: 'false',
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
  assert.equal(health.body.mode, 'degraded');

  const ready = await request('/ready');
  assert.equal(ready.response.status, 200, JSON.stringify(ready.body));
  assert.equal(ready.body.mode, 'degraded');
  assert.deepEqual(ready.body.checks, { database: true, paymentProvider: true, reconciliation: true });
  assert.deepEqual(ready.body.payments, {
    enabled: false,
    providerConfigured: false,
    reconciliationConfigured: false,
  });

  const context = await request('/public/context?path=%2F&lang=ru');
  assert.equal(context.response.status, 200, JSON.stringify(context.body));
  assert.equal(context.body.config.paymentsEnabled, false);

  for (const [pathname, method, body] of [
    ['/payments', 'POST', '{}'],
    ['/payments/missing/payment-object', 'GET', undefined],
    ['/payments/missing/reconcile', 'POST', undefined],
    ['/halyk/postlink', 'POST', '{}'],
  ]) {
    const result = await request(pathname, { method, body });
    assert.equal(result.response.status, 503, `${method} ${pathname}: ${JSON.stringify(result.body)}`);
    assert.equal(result.body?.error?.message, 'Payments are temporarily unavailable.');
  }

  assert.match(logs.join(''), /degraded mode is active/i);
});
