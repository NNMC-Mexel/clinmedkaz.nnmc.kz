# 07 · Changelog

## 2026-06-29

- `server/` стал корнем Strapi-проекта.
- Убран отдельный Express backend.
- Убран `server/cms/`; Strapi развернут напрямую в `server`.
- Убран старый JSON-store workflow.
- Payment/admin REST endpoints перенесены в Strapi custom controllers.
- `client/` переведен на Vite + React.
- Клиент общается с backend только через REST API `/api/*`.
