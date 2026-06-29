# 05 · Code Review Notes

Текущая структура после реорганизации:

- `client/` — Vite + React.
- `server/` — Strapi v5 backend с custom REST API.

Старого Express backend и JSON-хранилища больше нет.

## Что проверять дальше

- Настроить роли/permissions Strapi для production.
- Проверить Halyk credentials и `BASE_URL` перед production.
- Добавить e2e-тесты payment flow: invitation → order → Halyk callback.
- Расширить React admin UI: фильтры, редактирование заказа, экспорт.
