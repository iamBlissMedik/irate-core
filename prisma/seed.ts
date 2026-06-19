/**
 * Database seed — role-based demo data.
 *
 * Creates:
 *   - 1 ADMIN user
 *   - 3 regular USERs, each with a wallet
 *   - Starting balances + a couple of transactions/ledger entries so the
 *     admin dashboard has something to show.
 *
 * All money is in MINOR UNITS (kobo). 1 NGN = 100 kobo.
 *
 * Run with:  npm run seed
 * Idempotent: re-running upserts users and resets their wallet/ledger state.
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/client/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const naira = (amount: number) => BigInt(amount) * 100n; // NGN -> kobo

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@irate.dev";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
const USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "Password123!";

async function main() {
  // Safety: never wipe a production database.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run destructive seed with NODE_ENV=production");
  }

  // Clean slate so the seed is fully reproducible (FK-safe order).
  await prisma.ledger.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.kYC.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, 10),
    bcrypt.hash(USER_PASSWORD, 10),
  ]);

  // --- Admin ---
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: adminHash, role: "ADMIN" },
    create: { email: ADMIN_EMAIL, password: adminHash, role: "ADMIN" },
  });

  // --- Regular users + wallets (fixed account numbers for an easy demo) ---
  const userSeeds = [
    { email: "ada@irate.dev", balance: naira(50_000), accountNumber: "1000000001" },
    { email: "bola@irate.dev", balance: naira(12_500), accountNumber: "1000000002" },
    { email: "chidi@irate.dev", balance: naira(0), accountNumber: "1000000003" },
  ];

  const users = [];
  for (const seed of userSeeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { password: userHash, role: "USER" },
      create: { email: seed.email, password: userHash, role: "USER" },
    });

    // Reset wallet state so the seed is idempotent.
    await prisma.wallet.deleteMany({ where: { userId: user.id } });
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balance: seed.balance,
        accountNumber: seed.accountNumber,
      },
    });

    // Opening-balance ledger entry for funded wallets.
    if (seed.balance > 0n) {
      const openingTx = await prisma.transaction.create({
        data: { walletId: wallet.id, type: "CREDIT", amount: seed.balance },
      });
      await prisma.ledger.create({
        data: {
          walletId: wallet.id,
          referenceId: openingTx.id,
          description: "Opening balance (seed)",
          amount: seed.balance,
          balanceBefore: 0n,
          balanceAfter: seed.balance,
          type: "CREDIT",
        },
      });
    }

    users.push({ ...user, walletId: wallet.id, accountNumber: seed.accountNumber });
  }

  // --- One sample transfer (Ada -> Bola, 2,000 NGN) for the dashboard ---
  const ada = users[0];
  const bola = users[1];
  const transferAmount = naira(2_000);

  await prisma.$transaction(async (tx) => {
    const adaWallet = await tx.wallet.update({
      where: { id: ada.walletId },
      data: { balance: { decrement: transferAmount } },
    });
    const bolaWallet = await tx.wallet.update({
      where: { id: bola.walletId },
      data: { balance: { increment: transferAmount } },
    });

    const debit = await tx.transaction.create({
      data: { walletId: ada.walletId, type: "DEBIT", amount: transferAmount },
    });
    const credit = await tx.transaction.create({
      data: { walletId: bola.walletId, type: "CREDIT", amount: transferAmount },
    });

    await tx.ledger.create({
      data: {
        walletId: ada.walletId,
        referenceId: debit.id,
        description: `Transfer to ${bola.accountNumber}`,
        amount: transferAmount,
        balanceBefore: adaWallet.balance + transferAmount,
        balanceAfter: adaWallet.balance,
        type: "DEBIT",
      },
    });
    await tx.ledger.create({
      data: {
        walletId: bola.walletId,
        referenceId: credit.id,
        description: `Transfer from ${ada.accountNumber}`,
        amount: transferAmount,
        balanceBefore: bolaWallet.balance - transferAmount,
        balanceAfter: bolaWallet.balance,
        type: "CREDIT",
      },
    });
  });

  console.log("✅ Seed complete");
  console.table([
    { role: "ADMIN", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, accountNumber: "-" },
    ...userSeeds.map((u) => ({
      role: "USER",
      email: u.email,
      password: USER_PASSWORD,
      accountNumber: u.accountNumber,
    })),
  ]);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
