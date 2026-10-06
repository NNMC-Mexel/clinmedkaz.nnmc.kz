# 07 · Changelog

## 2026-10-06

- PDF-квитанция об оплате (`server/src/lib/receipt-pdf.ts`, ru/kk/en): реквизиты ННМЦ, плательщик, назначение, дата, маска карты, референс Halyk. Прикладывается к письму плательщику и админу после подтверждения оплаты.
- Скачивание квитанции: `GET /api/payments/:id/receipt.pdf` (только для оплаченных заказов, кнопка на странице успешной оплаты) и `GET /api/admin/orders/:id/receipt.pdf` (кнопка в истории транзакций).
- Цена задаётся в базовой валюте на выбор (KZT или USD), вторая считается по курсу.
- Курс USD/KZT: официальный курс НБ РК (`lib/exchange-rate.ts`, обновление cron'ом раз в час) или ручной. Уже отправленные ссылки сохраняют свою сумму.

## 2026-06-29

- `server/` стал корнем Strapi-проекта.
- Убран отдельный Express backend.
- Убран `server/cms/`; Strapi развернут напрямую в `server`.
- Убран старый JSON-store workflow.
- Payment/admin REST endpoints перенесены в Strapi custom controllers.
- `client/` переведен на Vite + React.
- Клиент общается с backend только через REST API `/api/*`.
