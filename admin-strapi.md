# Strapi Backend

Strapi теперь развернут прямо в [server](server/).

## Запуск

```bash
cp .env.example .env
npm install
npm run dev:server
```

Strapi будет доступен на `http://localhost:1337`.

React-клиент запускается отдельно:

```bash
npm run dev:client
```

Клиент проксирует `/api/*` в Strapi.
