# 08 · Admin Auth

Админская авторизация ClinMedKaz Pay использует встроенный Strapi
Users & Permissions JWT.

## Flow

1. Клиентская админка отправляет логин и пароль в стандартный endpoint:

```http
POST /api/auth/local
```

2. Strapi возвращает JWT:

```json
{ "jwt": "...", "user": { "id": 1, "username": "admin" } }
```

3. React хранит JWT в `sessionStorage` (с галочкой «Запомнить меня» — в `localStorage`)
и отправляет его в админские запросы:

```http
Authorization: Bearer <jwt>
```

4. Strapi проверяет токен, кладет пользователя в `ctx.state.user`, затем
проверяет permissions scope маршрута.

## Роли

При каждом старте Strapi создаёт три роли и выставляет им права (источник правды —
[server/src/lib/roles.ts](server/src/lib/roles.ts)). Права этих действий у других
ролей удаляются автоматически, вручную в Strapi их включать не нужно.

| Роль (type) | Кто | Что видит и делает |
|---|---|---|
| `payment-admin` — Payment Admin | Редакция | Всё: ссылки, транзакции, цена, «Финансы», «Аналитика», публикация, возвраты |
| `payment-accountant` — Payment Accountant | Бухгалтерия | «Транзакции» и «Финансы»: реестры оплат и возвратов, итоги по дням, статус сверки, оформление возврата, квитанции, CSV. Не создаёт ссылки, не меняет цену и данные публикации |
| `payment-economist` — Payment Economist | Экономисты | Только «Аналитика»: агрегаты без ФИО/email/телефонов (выручка по месяцам, структура, география, воронка, скидки, ожидаемые поступления), CSV агрегатов |

Как выдать роль:

- через env (роль назначается при старте; если пользователь указан в нескольких списках,
  побеждает более широкая роль):
  `PAYMENT_ADMIN_USERS` / `PAYMENT_ADMIN_EMAILS`,
  `PAYMENT_ACCOUNTANT_USERS` / `PAYMENT_ACCOUNTANT_EMAILS`,
  `PAYMENT_ECONOMIST_USERS` / `PAYMENT_ECONOMIST_EMAILS`;
- или вручную: Strapi admin → Content Manager → User → поле Role.

Env-списки главнее ручного назначения: если пользователь из списка уже был в другой платёжной
роли, при старте его переведут, а в лог попадёт предупреждение
`[payment-roles] <user> moved from <old> to <new> by the env role lists`. Убрать пользователя
из списка недостаточно, чтобы забрать роль: её нужно сменить в Strapi admin.

После входа каждая роль попадает на свой раздел: админ — «Создать ссылку»,
бухгалтер — «Финансы», экономист — «Аналитика». Недоступные разделы в меню не показываются,
а прямой URL перенаправляет на раздел роли.

## Protected API

Админские маршруты защищены не cookie, а Strapi permissions; контроллер дополнительно
проверяет роль (`requireRole`).

| Маршрут | admin | accountant | economist |
|---|---|---|---|
| `GET /api/admin/session` (возвращает `role` и `capabilities`) | ✓ | ✓ | ✓ |
| `GET /api/admin/orders`, `POST /api/admin/reconcile` | ✓ | ✓ | |
| `PATCH /api/admin/orders/:id` | ✓ | только `accountingStatus`, `refundStatus`, `refundReason`, `adminComment` | |
| `GET /api/admin/orders/export.csv`, `GET /api/admin/orders/:id/receipt.pdf` | ✓ | ✓ | |
| `GET /api/admin/reports/finance?from&to` | ✓ | ✓ | |
| `GET /api/admin/reports/analytics?from&to` | ✓ | | ✓ |
| `GET /api/admin/reports/export.csv?report=payments\|refunds\|daily` | ✓ | ✓ | |
| `GET /api/admin/reports/export.csv?report=monthly\|countries` | ✓ | | ✓ |
| `PUT /api/admin/pricing`, `GET /api/admin/exchange-rate` | ✓ | | |
| `POST /api/invitations`, `.../resend`, `.../cancel` | ✓ | | |

`Users-permissions`: `auth.callback` должен быть доступен Public role, чтобы
работал `POST /api/auth/local`.

## Возвраты

Сам возврат делается в кабинете Halyk ePay; в панели он только отмечается (админ или бухгалтер):

- отметить возврат (`requested` / `approved` / `processed`) можно только у оплаченного заказа и только
  с причиной (`refundReason`);
- `processed` переводит заказ в `refunded` и проставляет `refundedAt`; после этого статус возврата
  не меняется.

## Отчёты

- Период — даты `from`/`to` (включительно) по времени Астаны (UTC+5). По умолчанию «Финансы» —
  текущий месяц, «Аналитика» — последние 12 месяцев; максимум 3 года.
- Оплата попадает в период по дате банковской операции (`paymentReceivedAt`), возврат —
  по `refundedAt`. Возврат в месяце, следующем за оплатой, уменьшает выручку месяца возврата.
- Суммы по валютам — точные. Пересчёт USD в тенге — ориентировочный, по курсу, зафиксированному
  в ссылке; официальная переоценка — в учётной системе. Комиссия Halyk в данных не хранится.
- CSV для Excel: разделитель `;`, десятичная запятая, UTF-8 с BOM; текст, похожий на формулу,
  экранируется.

## Production

Для Users & Permissions JWT на production обязателен стабильный `JWT_SECRET`.
Если Strapi работает за nginx/reverse proxy с HTTPS-терминацией, оставьте:

```env
STRAPI_PROXY=true
JWT_SECRET=...
```
