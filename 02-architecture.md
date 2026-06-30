# 02 · Архитектура

## Компоненты

```
Автор / админ (браузер)
        │
        ▼
client/ — Vite + React
        │ REST /api/*
        ▼
server/ — Strapi v5
        ├─ content-types: order, invitation, payment-callback
        ├─ custom REST controllers: payments, invitations, admin, halyk, public
        └─ integrations: Halyk ePay, SMTP
```

В проекте теперь только два приложения:

- [client](client/) — Vite + React frontend.
- [server](server/) — Strapi backend. Strapi развернут прямо в `server`, без `server/cms` и без отдельного Express слоя.

## Server — `server/`

Strapi v5, TypeScript. Основные части:

| Путь | Ответственность |
|------|-----------------|
| [server/src/api](server/src/api) | Strapi content-types и custom REST routes/controllers |
| [server/src/lib](server/src/lib) | Общая доменная логика, Halyk, mailer, config, Strapi store helpers |
| [server/config](server/config) | Конфигурация Strapi |
| [server/.tmp](server/.tmp) | SQLite database в dev |

REST API, который использует клиент:

- `GET /api/public/context`
- `POST /api/payments`
- `GET /api/payments/:id/payment-object`
- `POST /api/halyk/postlink`
- `POST /api/invitations`
- `POST /api/invitations/:id/resend`
- `POST /api/invitations/:id/cancel`
- `POST /api/auth/local`
- `GET /api/admin/session`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id`
- `GET /api/admin/orders/export.csv`

## Client — `client/`

Vite + React. В dev клиент работает на `http://localhost:5173` и проксирует `/api/*`
в Strapi на `http://localhost:1337`.

В production клиент работает на `https://clinmedkaz.nnmc.kz`, а API Strapi —
на `https://clinmedkazserver.nnmc.kz/api/*`. Для прямого обращения фронта к
бэку клиент использует `VITE_API_BASE_URL`, а Strapi разрешает origin фронта
через `CORS_ORIGINS`.

| Путь | Ответственность |
|------|-----------------|
| [client/src/main.jsx](client/src/main.jsx) | React приложение, routing по `window.location.pathname`, формы оплаты и админки |
| [client/src/styles.css](client/src/styles.css) | Общие стили |
| [client/public/assets](client/public/assets) | Платежные логотипы и публичные ассеты |

## Хранилище

Основное хранилище — Strapi content-types:

- `order` — платежный заказ.
- `invitation` — персональная ссылка на оплату.
- `payment-callback` — аудит callback-ов Halyk.

Старого JSON-хранилища `data/store.json` больше нет.

## Интеграция с Halyk ePay

```
1. Client: POST /api/payments
2. Strapi: создает order в content-type order
3. Client: GET /api/payments/:id/payment-object
4. Strapi: получает OAuth token у Halyk и возвращает paymentObject
5. Browser: window.halyk.pay(paymentObject)
6. Halyk: POST /api/halyk/postlink
7. Strapi: сверяет secret_hash, amount/currency и обновляет order/invitation
```

## Технологический стек

| Слой | Сейчас |
|------|--------|
| Frontend | Vite + React |
| Backend | Strapi v5 + TypeScript |
| Storage | Strapi content-types / SQLite в dev |
| Платежи | Halyk ePay |
| Почта | nodemailer SMTP |
