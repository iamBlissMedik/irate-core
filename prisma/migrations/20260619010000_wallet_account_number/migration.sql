-- Add a unique 10-digit account number to every wallet.

-- 1. Add as nullable so we can backfill existing rows.
ALTER TABLE "Wallet" ADD COLUMN "accountNumber" TEXT;

-- 2. Backfill existing wallets with sequential, unique 10-digit numbers.
UPDATE "Wallet" w
SET "accountNumber" = sub.acct
FROM (
  SELECT id,
         lpad((1000000000 + row_number() OVER (ORDER BY "createdAt"))::text, 10, '0') AS acct
  FROM "Wallet"
) sub
WHERE w.id = sub.id;

-- 3. Enforce NOT NULL + uniqueness going forward.
ALTER TABLE "Wallet" ALTER COLUMN "accountNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Wallet_accountNumber_key" ON "Wallet"("accountNumber");
