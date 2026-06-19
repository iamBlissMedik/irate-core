# Adding a new product (module)

iRate is organized **by feature**. Every product — auth, wallet, transaction,
kyc, and any new one — is a self-contained module under `src/modules/<name>/`
that owns its full vertical slice and reuses the shared plumbing in `src/core/`.

This guide is the repeatable recipe. It uses a **Savings** product as the
example (savings "pots" a user can fund from their wallet).

---

## Module anatomy

Each module is the same four (sometimes five) files:

```
src/modules/savings/
├── savings.schema.ts      # Zod request validation
├── savings.service.ts     # business logic + the ONLY DB/Redis access
├── savings.controller.ts  # thin: req -> service -> response
├── savings.routes.ts      # URLs + middleware (authenticate, isAdmin, validate)
└── savings.types.ts       # (optional) shared TS types for the module
```

### The request lifecycle

```
routes  ->  validate(schema)  ->  authenticate / isAdmin  ->  controller  ->  service  ->  DB
```

**Golden rule:** controllers stay ~5 lines. All logic lives in the service.
That's what makes services unit-testable (mock Prisma/Redis) and reusable
(one service can call another — see `AdminService`).

---

## The 5 steps

### 1. Create the module folder

`src/modules/savings/savings.schema.ts` — validate input. **Money is always an
integer in minor units (kobo).**

```ts
import { z } from "zod";

export const createPotSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  targetAmount: z.coerce
    .number()
    .int("targetAmount must be in minor units (kobo)")
    .positive(),
});

export const fundPotSchema = z.object({
  walletId: z.cuid("Invalid walletId"),
  amount: z.coerce.number().int().positive(),
});
```

`savings.service.ts` — logic + DB. Reuse existing primitives instead of
re-implementing money movement.

```ts
import { prisma } from "@core/config/prisma";
import { AppError } from "@core/errors/AppError";

export class SavingsService {
  async createPot(userId: string, name: string, targetAmount: bigint) {
    return prisma.savingsPot.create({
      data: { userId, name, targetAmount, balance: 0n },
    });
  }

  async getMyPots(userId: string) {
    return prisma.savingsPot.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // A "fund" is just: debit the wallet, credit the pot, record a ledger row.
  // Do it inside one prisma.$transaction so it's atomic (see TransactionService).
  async fundPot(potId: string, walletId: string, userId: string, amount: bigint) {
    if (amount <= 0n) throw new AppError("Amount must be positive", 400);
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet || wallet.userId !== userId)
        throw new AppError("Wallet not found", 404);
      if (wallet.balance < amount)
        throw new AppError("Insufficient balance", 400);
      // ... decrement wallet, increment pot, create ledger entry ...
    });
  }
}
```

`savings.controller.ts` — thin glue. Convert amounts to `BigInt` with
`parseAmount`, use `sendResponse`, and emit an audit log for money movement.

```ts
import { Request, Response } from "express";
import { sendResponse } from "@core/utils/response";
import { parseAmount } from "@core/utils/money";
import { auditLog } from "@core/utils/auditLogger";
import { SavingsService } from "./savings.service";

const savings = new SavingsService();

export class SavingsController {
  async create(req: Request, res: Response) {
    const { name, targetAmount } = req.body;
    const pot = await savings.createPot(req.user.id, name, parseAmount(targetAmount));
    sendResponse(res, 201, true, "Savings pot created", pot);
  }

  async listMine(req: Request, res: Response) {
    const pots = await savings.getMyPots(req.user.id);
    sendResponse(res, 200, true, "Savings pots retrieved", pots);
  }

  async fund(req: Request, res: Response) {
    const { walletId, amount } = req.body;
    const pot = await savings.fundPot(req.params.potId, walletId, req.user.id, parseAmount(amount));
    await auditLog("SAVINGS_FUND", req.user.id, { potId: req.params.potId, amount });
    sendResponse(res, 200, true, "Pot funded", pot);
  }
}
```

`savings.routes.ts` — URLs + middleware.

```ts
import { Router } from "express";
import { authenticate } from "@core/middleware/auth.middleware";
import { validate } from "@core/middleware/validate";
import { SavingsController } from "./savings.controller";
import { createPotSchema, fundPotSchema } from "./savings.schema";

const router = Router();
const c = new SavingsController();

router.post("/", authenticate, validate(createPotSchema), c.create);
router.get("/", authenticate, c.listMine);
router.post("/:potId/fund", authenticate, validate(fundPotSchema), c.fund);

export const savingsRouter = router;
```

### 2. Reuse, don't duplicate

Money movement, pagination shape, ledger entries, balance caching — these
already exist. Call into `WalletService` / `TransactionService` or copy the
`prisma.$transaction` pattern. Never re-implement transfers.

### 3. Mount it (one line)

In [`src/routes/v1/v1.routes.ts`](../src/routes/v1/v1.routes.ts):

```ts
import { savingsRouter } from "@modules/savings/savings.routes";
router.use("/savings", savingsRouter);
```

### 4. Add the database model (if needed)

In `prisma/schema.prisma` — **money columns are `BigInt` (minor units)**:

```prisma
model SavingsPot {
  id           String   @id @default(cuid())
  userId       String
  name         String
  balance      BigInt   @default(0)
  targetAmount BigInt
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

Then: `npx prisma migrate dev --name add_savings`.

### 5. Document & test (don't skip)

- **Postman:** add a "Savings" folder with each request to
  `postman/iRate.postman_collection.json`.
- **README:** add the endpoints to the API reference table.
- **Test:** add `src/__tests__/savings.service.test.ts` (mock Prisma) and/or a
  schema test.
- **Seed:** if it helps the demo, add a sample pot to `prisma/seed.ts`.

---

## Checklist for every new endpoint

- [ ] Zod schema validates the body (money as **integer minor units**)
- [ ] `authenticate` (and `isAdmin` if admin-only) on the route
- [ ] Logic in the **service**, controller stays thin
- [ ] Amounts parsed with `parseAmount` → `BigInt`; balances stay minor units
- [ ] Money-moving actions wrapped in `prisma.$transaction` + a ledger entry
- [ ] Sensitive/financial actions write an `auditLog(...)`
- [ ] Response uses `sendResponse(res, status, true, message, data)`
- [ ] Request added to the **Postman** collection
- [ ] Endpoint added to the **README** API table
- [ ] A **test** for the new service logic

---

## What lives in `core/` (shared — never re-implement in a module)

| Concern              | Where                                            |
| -------------------- | ------------------------------------------------ |
| Auth / role guards   | `core/middleware/auth.middleware.ts`, `isAdmin.ts` |
| Request validation   | `core/middleware/validate.ts`                    |
| Errors + handler     | `core/errors/*`, `core/utils/errorHandler.ts`    |
| Money helpers        | `core/utils/money.ts`                            |
| Response envelope    | `core/utils/response.ts`                         |
| Audit logging        | `core/utils/auditLogger.ts`                      |
| Logger               | `core/utils/logger.ts`                           |
| DB / cache clients   | `core/config/prisma.ts`, `core/config/redis.ts`  |
