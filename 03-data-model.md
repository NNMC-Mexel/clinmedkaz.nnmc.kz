# 03 · Модель данных

Стор — объект `{ invitations[], orders[], callbacks[] }`. В Strapi те же сущности
маппятся на коллекции с `externalId` = бизнес-id (`inv_*`, `ord_*`, `cb_*`).

## Invitation (приглашение / персональная ссылка)

Создаётся админом, фиксирует статью, автора и **снимок цены**.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string `inv_*` | Бизнес-идентификатор, попадает в ссылку `?invite=` |
| `status` | enum | См. машину состояний ниже |
| `email`, `fullName`, `phone` | string | Контакты автора |
| `articleTitle` | string | Название статьи (источник истины для заказа) |
| `lang` | `ru\|kk\|en` | Язык письма и формы |
| `publicationFeeUsd` | number | Снимок fee в USD на момент создания |
| `usdToKztRate` | number | Снимок курса |
| `residentAmount` / `residentCurrency` | number / `KZT` | Цена для резидента РК |
| `nonResidentAmount` / `nonResidentCurrency` | number / `USD` | Цена для нерезидента |
| `createdAt`, `updatedAt` | ISO | Таймстемпы |

## Order (заказ / платёж)

Создаётся, когда автор отправляет форму. Содержит платёжные и пострасчётные поля.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | string `ord_*` | Бизнес-id, используется в URL `/pay/:id` |
| `invoiceId` | string (15 цифр) | Идентификатор для Halyk, уникален |
| `secretHash` | string (private) | Секрет для сверки подлинности postlink |
| `status` | enum | Платёжный статус (см. ниже) |
| `amount`, `currency` | number, string | Сумма к оплате |
| `publicationFeeUsd`, `exchangeRate` | number | Снимок цены |
| `residency` | `resident_kz\|non_resident` | Резидентство плательщика |
| `fullName`, `email`, `phone` | string | Данные плательщика (из формы) |
| `articleTitle` | string | Берётся из приглашения, не из формы |
| `lang` | `ru\|kk\|en` | Язык |
| `invitationId` | string | Ссылка на приглашение |
| `halykReference`, `cardMask`, `reason` | string | Данные результата от Halyk |
| `paymentReceivedAt` | ISO\|null | Момент успешной оплаты |
| `publicationStatus` | enum | Статус публикации (пострасчётный workflow) |
| `publishedAt`, `articleUrl`, `doi` | ISO/string | Данные публикации |
| `refundStatus`, `refundReason` | enum/text | Возвраты |
| `accountingStatus` | enum | Сверка бухгалтерией |
| `adminComment` | text | Заметка админа |
| `postbacks` | json[] | История колбэков по заказу |
| `createdAt`, `updatedAt` | ISO | Таймстемпы |

## Payment Callback (аудит)

Любой входящий `postlink` от Halyk, в т.ч. «несопоставленные» (unmatched).

| Поле | Описание |
|------|----------|
| `id` `cb_*`, `receivedAt` | Идентификатор и время |
| `invoiceId` | Из payload Halyk |
| `matchedOrderId`, `matched` | Найден ли заказ |
| `secretMatches` | Совпал ли `secret_hash` |
| `code`, `reference` | Результат Halyk |
| `payload` | Сырое тело колбэка |

---

## Машины состояний

### Order.status (платёж)

```
                ┌─────────┐
                │ created │  (форма отправлена, заказ создан)
                └────┬────┘
                     │ POST /api/payments (повторно → отдаётся существующий)
          (нет отдельного перехода payment_started в коде сервиса —
           см. примечание ниже)
                     │ GET /payment-object → выдан OAuth-токен
                     ▼
              ┌──────────────┐
              │ token_issued │
              └──────┬───────┘
        postlink ────┼──────────────────────────────┐
        secret OK    │                               │ secret НЕ совпал
        code=ok      │ code≠ok                       ▼
          ▼          ▼                        ┌──────────────────┐
      ┌──────┐   ┌────────┐                   │ postlink_rejected│
      │ paid │   │ failed │                   └──────────────────┘
      └──────┘   └────────┘
      (финал)

  cancelled / refunded — заведены в enum, но переходов в коде нет (только ручной задел).
```

> **Примечание.** Статус `payment_started` присутствует в enum и в наборе «активных»
> статусов (`activeOrderForInvitation`), но **`server.js` его заказу не присваивает** —
> заказ создаётся как `created` и сразу уходит в `token_issued`. На `payment_started`
> переводится **приглашение** при создании заказа. Это рассинхрон концепций — см.
> [05-code-review.md](05-code-review.md), F-2.

### Invitation.status

```
  created ──(создан заказ)──▶ payment_started ──(postlink)──▶ paid | failed
     │
     └──(админ)──▶ cancelled            (отмена пока нет в коде — задел)
```

> Сейчас в приглашение записывается **тот же** статус, что у заказа (`paid`/`failed`).
> Это смешивает «статус платежа» и «статус приглашения». Целевая модель разделяет их —
> см. [04-business-logic.md](04-business-logic.md).

### Order.publicationStatus (пострасчётный workflow)

```
  pending_payment ──(оплачено)──▶ ready_to_publish ──▶ published
                                        │
                                        └──▶ on_hold / cancelled
```

Переход `pending_payment → ready_to_publish` происходит автоматически при оплате.
Дальнейшие переходы **не реализованы** (нет endpoint'ов и UI).

### Order.refundStatus

`none → requested → approved → rejected → processed` — задел в enum, без реализации.

### Order.accountingStatus

`new → reconciled → exported → disputed` — задел в enum, без реализации.

---

## Прайсинг (снимок цены)

Цена определяется при создании приглашения и копируется в заказ:

- **Резидент РК** → `residentAmount` (`KZT`) = `round(publicationFeeUsd × usdToKztRate)`.
- **Нерезидент** → `nonResidentAmount` (`USD`) = `publicationFeeUsd`.

Базовые значения — из `.env`: `PUBLICATION_FEE_USD` (300), `USD_TO_KZT_RATE` (485.4).
Снимок защищает от изменения курса между приглашением и оплатой — это правильно.

> Риск: курс `USD_TO_KZT_RATE` статичен в `.env` и обновляется вручную. Целевой
> вариант — фиксировать актуальный курс на момент приглашения из надёжного источника
> (см. [06-roadmap.md](06-roadmap.md)).
