-- Convert monetary columns from DOUBLE PRECISION to BIGINT (integer minor units).
-- Existing float values are rounded to the nearest whole minor unit.

-- Wallet.balance
ALTER TABLE "Wallet"
  ALTER COLUMN "balance" SET DATA TYPE BIGINT USING round("balance")::bigint,
  ALTER COLUMN "balance" SET DEFAULT 0;

-- Transaction.amount
ALTER TABLE "Transaction"
  ALTER COLUMN "amount" SET DATA TYPE BIGINT USING round("amount")::bigint;

-- Ledger.amount / balanceBefore / balanceAfter
ALTER TABLE "Ledger"
  ALTER COLUMN "amount" SET DATA TYPE BIGINT USING round("amount")::bigint,
  ALTER COLUMN "balanceBefore" SET DATA TYPE BIGINT USING round("balanceBefore")::bigint,
  ALTER COLUMN "balanceAfter" SET DATA TYPE BIGINT USING round("balanceAfter")::bigint;

-- Indexes for common access patterns / dashboard aggregations.
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");
CREATE INDEX "Ledger_walletId_createdAt_idx" ON "Ledger"("walletId", "createdAt");
