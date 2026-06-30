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

3. React хранит JWT в `sessionStorage` и отправляет его в админские запросы:

```http
Authorization: Bearer <jwt>
```

4. Strapi проверяет токен, кладет пользователя в `ctx.state.user`, затем
проверяет permissions scope маршрута.

## Protected API

Админские маршруты защищены не cookie, а Strapi permissions:

- `GET /api/admin/session`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id`
- `GET /api/admin/orders/export.csv`
- `POST /api/invitations`
- `POST /api/invitations/:id/resend`
- `POST /api/invitations/:id/cancel`

В Strapi нужно создать пользователя в Users & Permissions и включить для его
роли нужные действия:

- `Admin-api`: `session`, `orders`, `updateOrder`, `exportCsv`
- `Invitation`: `createPaymentInvitation`, `resend`, `cancel`
- `Users-permissions`: `auth.callback` должен быть доступен Public role, чтобы
  работал `POST /api/auth/local`

## Production

Для Users & Permissions JWT на production обязателен стабильный `JWT_SECRET`.
Если Strapi работает за nginx/reverse proxy с HTTPS-терминацией, оставьте:

```env
STRAPI_PROXY=true
JWT_SECRET=...
```
