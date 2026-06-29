# 08 · Admin Auth

Админская авторизация теперь реализована как custom REST endpoints внутри Strapi:

- `POST /api/admin/login`
- `GET /api/admin/session`
- `POST /api/admin/logout`

Клиентская админка живет в React-приложении `client/` и ходит в эти REST endpoints.

Сессия хранится в httpOnly cookie `clinmed_admin_session`, подписанной через
`ADMIN_SESSION_SECRET`.

Fallback-аккаунт задается через `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
ADMIN_SESSION_SECRET=...
ADMIN_TOKEN=...
```
