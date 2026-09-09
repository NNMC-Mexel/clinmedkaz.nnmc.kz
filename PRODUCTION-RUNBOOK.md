# ClinMedKaz Payments — production runbook

## 1. Перед релизом

- Использовать Node.js 22.13+ и устанавливать зависимости только через `npm ci`.
- Запустить `npm test --prefix server` и `npm run build --prefix client`.
- Настроить PostgreSQL, HTTPS для frontend/backend, SMTP, отдельного пользователя с ролью `Payment Admin` и боевые Halyk ePay credentials.
- Включить `HALYK_STATUS_SYNC_ENABLED=true`, `PAYMENT_RECONCILIATION_CRON_ENABLED=true` и `CRON_ENABLED=true` ровно на одном экземпляре приложения. На остальных экземплярах cron следует отключить.
- Задать уникальные сильные `APP_KEYS`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY` и `JWT_SECRET` через secret storage платформы.
- Задать явный HTTPS-origin в `CORS_ORIGINS`. Wildcard в production не использовать.

При небезопасной production-конфигурации приложение завершится при старте с перечнем отсутствующих настроек.

### Временный degraded mode без Halyk

Пока банк не выдал production credentials, разрешён запуск сайта без приёма оплат:

```env
PAYMENTS_ENABLED=false
HALYK_STATUS_SYNC_ENABLED=false
PAYMENT_RECONCILIATION_CRON_ENABLED=false
CRON_ENABLED=false
```

Не задавать фиктивные `HALYK_CLIENT_ID`, `HALYK_CLIENT_SECRET` или `HALYK_TERMINAL_ID`.
В degraded mode сайт, CMS, pricing и история транзакций доступны, но новые приглашения,
платёжные токены, callback и ручная сверка платежа заблокированы. `health` и `ready`
отвечают `200` с `mode: degraded`, если база данных доступна.

После получения ключей установить `PAYMENTS_ENABLED=true`, добавить production credentials,
включить status sync и reconciliation cron, затем выполнить полный smoke-test из раздела 2.

### Coolify: production ePay

Готовый перечень переменных для backend и frontend находится в
[`COOLIFY-ENV.example`](COOLIFY-ENV.example). Для backend в Coolify выбрать base directory
`/server`, для frontend — `/client`.

- `HALYK_CLIENT_SECRET` и остальные секреты задавать только как runtime variables. Для
  `HALYK_CLIENT_SECRET` обязательно включить **Literal**, потому что production-ключ может
  содержать `$` и другие специальные символы. Build Variable для банковских и Strapi-секретов
  отключить.
- `VITE_API_BASE_URL` относится только к frontend и должен быть включён как Build Variable.
- `TildaSecret` не добавлять: он нужен модулю EPAY2 на Tilda, а это приложение использует
  прямую интеграцию ePay по `ClientID`, `ClientSecret` и `TerminalID`.
- Не добавлять устаревший `HALYK_POSTLINK_SECRET`: для каждого заказа генерируется отдельный
  `secret_hash`, который ePay возвращает в postlink.

Production endpoints выбираются автоматически при `HALYK_ENV=prod`:

- OAuth: `https://epay-oauth.homebank.kz/oauth2/token`;
- payment form: `https://epay.homebank.kz/payform/payment-api.js`;
- transaction status: `https://epay-api.homebank.kz/check-status/payment/transaction/:invoiceId`.

## 2. Проверка после деплоя

1. `GET /api/health` должен отвечать `200`, `status: ok` и ожидаемым `mode` (`full` или `degraded`).
2. `GET /api/ready` должен отвечать `200`, а все checks — `true`; поле `payments.enabled` должно соответствовать режиму релиза.
3. Для degraded mode проверить баннер «Оплата временно недоступна» и контролируемый `503` с кодом `PAYMENTS_DISABLED` на `POST /api/payments`; пункты ниже выполнять только в full mode.
4. Войти пользователем `Payment Admin`; обычный пользователь должен получать `403` на `/api/admin/*`.
5. Создать тестовое приглашение без отправки письма, открыть его и проверить сумму/язык.
6. Проверить доставку реального тестового письма через настроенный SMTP.
7. Выполнить одну согласованную минимальную оплату боевой картой через Halyk, проверить статус `Оплачен`, письмо автору/администратору и запись reference/card mask. Затем оформить возврат по утверждённой процедуре.

Последний пункт нельзя заменять синтетическим callback: это обязательный ручной smoke-test интеграции с банком.

## 3. Мониторинг и алерты

- Проверять `/api/health` каждые 30 секунд; алерт после 3 ошибок подряд.
- Проверять `/api/ready` каждую минуту; любое `503` требует реакции.
- Алертовать на рост HTTP 5xx, HTTP 429, `Scheduled payment reconciliation failed`, `Payment provider token request failed` и `Halyk status reconciliation failed`.
- Алертовать, если заказ остаётся в `created`/`token_issued` больше 30 минут, либо число `postlink_rejected` резко растёт.
- Логи отправлять централизованно. `X-Request-Id` использовать для связи запроса с логами. Не логировать body callback, JWT, cookies или банковские secrets.

## 4. Резервные копии PostgreSQL

- Делать ежедневный encrypted backup, хранить минимум 30 дней и отдельную еженедельную копию 90 дней.
- Не реже раза в месяц восстанавливать последнюю копию в изолированную БД и проверять количество invitations/orders/callbacks и открытие админки.
- Перед миграцией или изменением схемы создавать отдельный snapshot.
- Доступ к backup storage предоставлять только production-операторам; включить versioning/immutability, если платформа поддерживает.

## 5. Инцидент и rollback

1. Остановить новые релизы; при подозрении на некорректное списание временно скрыть публичный CTA, не удаляя заказы.
2. Зафиксировать request ID, invoice ID и временной интервал. Никогда не пересылать `secretHash`, client secret или полный номер карты.
3. Откатить приложение на предыдущий проверенный image. Схему БД откатывать только по отдельному протестированному плану.
4. После отката проверить health/readiness и запустить административную сверку с Halyk.
5. При компрометации старого callback-secret его следует удалить/ротировать в окружении: текущая версия больше не использует глобальный secret в URL.

## 6. Критерии go/no-go

Go разрешён только при зелёном CI, PostgreSQL backup/restore test, рабочем SMTP, зелёном readiness и успешной реальной минимальной Halyk-оплате. Если любой из этих пунктов не подтверждён, релиз считается условным и требует письменного принятия риска владельцем продукта.
