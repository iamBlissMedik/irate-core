# iRate Backend

A role-based **fintech wallet & ledger** API built with Express 5, Prisma 7
(PostgreSQL), and Redis. It supports authentication, KYC, wallets, atomic money
transfers with an immutable ledger, and an admin dashboard.

---

## Table of contents

- [Stack](#stack)
- [Architecture](#architecture)
- [Money: minor units](#money-minor-units)
- [Roles](#roles)
- [Quick start](#quick-start)
- [Seed data](#seed-data)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Postman](#postman)
- [Testing](#testing)
- [Scripts](#scripts)

---

## Stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Runtime        | Node.js + TypeScript                     |
| Web framework  | Express 5                                |
| ORM / DB       | Prisma 7 + PostgreSQL                    |
| Cache / rate   | Redis (ioredis)                          |
| Auth           | JWT (access + refresh), bcrypt           |
| Validation     | Zod                                      |
| Security       | Helmet, CORS allowlist, Redis rate limit |
| Logging        | Pino + pino-http                         |
| Tests          | Jest + ts-jest                           |

## Architecture

Feature-based modules. Each module owns its routes → controller → service →
schema:

```
src/
├── core/
│   ├── app.ts                 # express app: security, logging, routes, errors
│   ├── server.ts              # bootstrap + graceful shutdown
│   ├── config/                # env, prisma, redis, cors
│   ├── middleware/            # authenticate, isAdmin, validate, requestLogger
│   ├── errors/                # AppError / AuthError / ValidationError
│   └── utils/                 # logger, money, response, auditLogger, handlers
├── modules/
│   ├── auth/  user/  wallet/  transaction/  kyc/  admin/
└── routes/v1/v1.routes.ts     # mounts every module under /api/v1
```

- **Controllers** are thin: read the request, call a service, send a response.
- **Services** hold business logic and own all database access.
- **Errors** thrown anywhere bubble to a single global error handler that maps
  them to a `{ success, message }` JSON envelope.

> Adding a new product/feature? Follow the recipe in
> [`docs/ADDING-A-PRODUCT.md`](docs/ADDING-A-PRODUCT.md) — every module is the
> same routes → controller → service → schema slice.

## Money: minor units

> **All monetary values are integer _minor units_ — kobo for NGN (1 NGN = 100
> kobo), like cents for USD.**

Why: floating-point math is unsafe for money (`0.1 + 0.2 !== 0.3`). Storing
integers makes every operation exact — this is the standard fintech convention
(Stripe, PayPal, etc. all use minor units).

- DB columns (`Wallet.balance`, `Transaction.amount`, `Ledger.*`) are
  **`BigInt`**, so balances scale far past the ~2.1B limit of a 32-bit int.
- Because JSON has no BigInt type, money is **returned as a string** (e.g.
  `"4800000"`). Clients divide by 100 for display → `₦48,000.00`.
- Request bodies send amounts as **integers** in minor units (e.g. `amount: 1500`
  = ₦15.00). The `parseAmount`/money helpers live in
  [`src/core/utils/money.ts`](src/core/utils/money.ts).

## Roles

Two roles via the `UserRole` enum: `USER` and `ADMIN`.

- `authenticate` middleware verifies the JWT and attaches `req.user`.
- `isAdmin` middleware guards every `/admin/*` route (403 for non-admins).
- New sign-ups are always `USER`. Admins are created by the seed (or promoted in
  the DB).
- A user may only read **their own** profile via `/users/:userId`; only ADMINs
  can read other users (prevents IDOR / data leakage).

## Accounts & sending money

Every user gets a **wallet with a unique 10-digit account number** automatically
on registration (NUBAN-style, like Nigerian banks). That account number is what
they share to receive money.

Sending money is a two-step flow, mirroring real banking apps:

1. **Name enquiry** — `GET /transactions/resolve/:accountNumber` returns the
   recipient's display name so the sender can confirm who they're paying (it
   never leaks the recipient's email or balance).
2. **Transfer** — `POST /transactions/transfer` with `{ toAccountNumber, amount }`
   debits the caller's wallet and credits the recipient's, atomically, with a
   double-entry ledger record. A unique `Idempotency-Key` header is required so a
   retried request can't double-send.

### Transaction history feed

`GET /transactions/me` returns each entry enriched from the ledger so it reads
like a bank statement — direction, description, the resolved counterparty, and
the running balance (all money in minor units):

```json
{
  "id": "cmqki2q63...",
  "type": "DEBIT",
  "direction": "out",
  "amount": "250000",
  "description": "Transfer to 1000000002",
  "counterparty": { "accountNumber": "1000000002", "name": "Bola" },
  "balanceAfter": "4550000",
  "createdAt": "2026-06-19T05:40:34.683Z"
}
```

## Quick start

**Prerequisites:** Node 18+, PostgreSQL, and Redis running locally.

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env        # then edit DATABASE_URL etc.

# 3. Create the schema
npm run deploy:migrate      # applies migrations (or `npm run migrate` in dev)

# 4. Seed role-based demo data
npm run seed

# 5. Run
npm run dev                 # http://localhost:8000  (hot reload)
# or production build:
npm run build && npm start
```

Health check: `GET http://localhost:8000/health`.

## Seed data

`npm run seed` wipes the local tables and inserts a clean, reproducible dataset
(it **refuses to run** when `NODE_ENV=production`). Credentials come from `.env`
(`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD`) with these
defaults:

| Role  | Email             | Password       | Account number | Starting balance |
| ----- | ----------------- | -------------- | -------------- | ---------------- |
| ADMIN | admin@irate.dev   | `Admin123!`    | —              | —                |
| USER  | ada@irate.dev     | `Password123!` | `1000000001`   | ₦48,000          |
| USER  | bola@irate.dev    | `Password123!` | `1000000002`   | ₦14,500          |
| USER  | chidi@irate.dev   | `Password123!` | `1000000003`   | ₦0               |

It also creates wallets, opening-balance ledger entries, and one sample transfer
so the admin dashboard has data.

## Environment variables

See [`.env.example`](.env.example). Key ones:

| Variable             | Required | Notes                                            |
| -------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`       | ✅       | PostgreSQL connection string                     |
| `REDIS_URL`          |          | Defaults to `redis://127.0.0.1:6379`             |
| `JWT_SECRET`         | ✅ prod  | Access-token secret                              |
| `JWT_REFRESH_SECRET` | ✅ prod  | Refresh-token secret                             |
| `PORT`               |          | Defaults to `8000`                               |
| `NODE_ENV`           |          | `development` \| `production`                    |
| `LOG_LEVEL`          |          | `debug` (dev) / `info` (prod) by default         |

In production, missing required secrets are **fatal at startup**; in development
they fall back to clearly-marked insecure defaults with a warning.

## API reference

Base path: `/api/v1`. All responses use `{ success, message, data }`.
🔒 = requires `Authorization: Bearer <accessToken>`. 👑 = requires ADMIN.

### Auth

| Method | Path             | Auth | Description                              |
| ------ | ---------------- | ---- | ---------------------------------------- |
| POST   | `/auth/register` | —    | Create a USER + wallet; returns account number |
| POST   | `/auth/login`    | —    | Returns `accessToken` + refresh cookie   |
| POST   | `/auth/refresh`  | 🍪   | New access token from refresh cookie     |
| POST   | `/auth/logout`   | 🔒   | Revoke refresh token + blacklist access  |

### Users

| Method | Path             | Auth | Description                |
| ------ | ---------------- | ---- | -------------------------- |
| GET    | `/users/me`      | 🔒   | Current user + wallets/KYC      |
| GET    | `/users/:userId` | 🔒   | User by id (self only, or ADMIN) |

### Wallets

| Method | Path                        | Auth | Description           |
| ------ | --------------------------- | ---- | --------------------- |
| POST   | `/wallets`                  | 🔒   | Create a wallet       |
| GET    | `/wallets`                  | 🔒   | List my wallets       |
| GET    | `/wallets/:walletId/balance`| 🔒   | Cached wallet balance |

### Transactions

| Method | Path                                    | Auth | Description                                     |
| ------ | --------------------------------------- | ---- | ---------------------------------------------- |
| GET    | `/transactions/resolve/:accountNumber`  | 🔒   | Name enquiry — recipient's display name        |
| POST   | `/transactions/transfer`                | 🔒   | Send money by account number. Body `{ toAccountNumber, amount }`. Requires `Idempotency-Key` header |
| GET    | `/transactions/me`                      | 🔒   | My full transaction history (all my wallets)   |
| GET    | `/transactions/:walletId/transactions`  | 🔒   | Single wallet's transaction history (paginated) |

### KYC

| Method | Path          | Auth | Description           |
| ------ | ------------- | ---- | --------------------- |
| POST   | `/kyc/submit` | 🔒   | Submit KYC details    |
| GET    | `/kyc/status` | 🔒   | My KYC status         |

### Admin 👑

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/admin/dashboard/overview`   | Aggregated dashboard stats           |
| GET    | `/admin/me`                   | Admin profile                        |
| GET    | `/admin/users`                | List users                           |
| GET    | `/admin/users/stats`          | User count + trend                   |
| GET    | `/admin/wallets/balance`      | Total balance across all wallets     |
| POST   | `/admin/credit/:walletId`     | Credit a wallet (minor units)        |
| GET    | `/admin/kyc`                  | List KYC submissions (filter/page)   |
| PATCH  | `/admin/kyc/:kycId/review`    | Approve / reject a KYC submission     |

## Postman

A ready-to-run collection lives in [`postman/`](postman/):

- `iRate.postman_collection.json` — every endpoint, grouped by module.
- `iRate.local.postman_environment.json` — the `iRate Local` environment.

**Usage:** import both, select the **iRate Local** environment, run **Auth →
Login** (saves `{{accessToken}}`) and **Auth → Login (Admin)** (saves
`{{adminToken}}`). Other requests pick the right token automatically. **List my
wallets** auto-saves `{{walletId}}`.

> **Convention — keep Postman in sync.** Whenever you add or change an endpoint,
> add/update its request in the collection in the same commit. The collection is
> the living API contract; a PR that adds a route but not its Postman request is
> incomplete.

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Tests (Jest + ts-jest) cover the money utilities, the Zod validation schemas,
and the auth service (with mocked Prisma/Redis) — no database required.

## Scripts

| Script                  | Does                                          |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Hot-reload dev server (nodemon + ts-node)     |
| `npm run build`         | Compile TS → `dist/`                          |
| `npm start`             | Run the compiled server                       |
| `npm run migrate`       | Create + apply a dev migration                |
| `npm run deploy:migrate`| Apply pending migrations (CI / prod)          |
| `npm run seed`          | Reset + seed local demo data                  |
| `npm test`              | Run the test suite                            |
