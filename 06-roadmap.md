# 06 · Roadmap

## Current Target Architecture

- Backend: Strapi v5 в папке `server/`.
- Frontend: Vite + React в папке `client/`.
- Communication: REST API `/api/*`.

## Next Steps

1. Довести React admin UI до полного back-office сценария.
2. Добавить e2e-тесты на REST API Strapi.
3. Настроить production permissions, backups и healthcheck для Strapi.
4. Добавить CI: `npm run build --prefix server` и `npm run build --prefix client`.
5. Подготовить deployment: Strapi отдельно, React build отдельно или за reverse proxy.
