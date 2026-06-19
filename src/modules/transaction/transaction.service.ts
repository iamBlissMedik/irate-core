import { prisma } from "@core/config/prisma";
import { redis } from "@core/config/redis";
import { AppError } from "@core/errors/AppError";
import { deriveAccountName } from "@core/utils/account";
import dayjs from "dayjs";

type RawTransaction = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: bigint;
  walletId: string;
  createdAt: Date;
};

const ACCOUNT_NUMBER_RE = /(\d{10})/;

/**
 * TransactionService owns money movement (transfer, admin credit) and the
 * system-wide stats used by the admin dashboard.
 *
 * `amount` arguments are integer minor units (kobo) as BigInt. See utils/money.ts.
 */
export class TransactionService {
  /**
   * Send money from the caller's wallet to a recipient identified by their
   * ACCOUNT NUMBER. amount is in minor units (kobo).
   */
  async transfer(
    userId: string,
    toAccountNumber: string,
    amount: bigint,
    idempotencyKey?: string
  ) {
    if (amount <= 0n) throw new AppError("Amount must be positive.", 400);

    // ✅ Idempotency required so a retried request can't double-spend.
    if (!idempotencyKey) {
      throw new AppError("Idempotency-Key header is required.", 400);
    }

    const cacheKey = `idem:${idempotencyKey}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) return JSON.parse(cachedResult);

    // ✅ Perform transfer atomically.
    const result = await prisma.$transaction(async (tx) => {
      const from = await tx.wallet.findFirst({ where: { userId } });
      if (!from) throw new AppError("You don't have a wallet yet.", 404);

      const to = await tx.wallet.findUnique({
        where: { accountNumber: toAccountNumber },
      });
      if (!to) throw new AppError("Recipient account not found.", 404);

      if (to.id === from.id)
        throw new AppError("Cannot transfer to your own account.", 400);

      // Race-safe debit: only succeeds if the balance is still sufficient.
      const debited = await tx.wallet.updateMany({
        where: { id: from.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count === 0)
        throw new AppError("Insufficient balance.", 400);

      const updatedTo = await tx.wallet.update({
        where: { id: to.id },
        data: { balance: { increment: amount } },
      });
      const balanceAfterFrom = from.balance - amount;

      const debitTx = await tx.transaction.create({
        data: { walletId: from.id, type: "DEBIT", amount },
      });
      const creditTx = await tx.transaction.create({
        data: { walletId: to.id, type: "CREDIT", amount },
      });

      await tx.ledger.create({
        data: {
          walletId: from.id,
          referenceId: debitTx.id,
          description: `Transfer to ${to.accountNumber}`,
          amount,
          balanceBefore: from.balance,
          balanceAfter: balanceAfterFrom,
          type: "DEBIT",
        },
      });
      await tx.ledger.create({
        data: {
          walletId: to.id,
          referenceId: creditTx.id,
          description: `Transfer from ${from.accountNumber}`,
          amount,
          balanceBefore: updatedTo.balance - amount,
          balanceAfter: updatedTo.balance,
          type: "CREDIT",
        },
      });

      return {
        reference: debitTx.id,
        amount,
        fromWalletId: from.id,
        toWalletId: to.id,
        from: { accountNumber: from.accountNumber, balance: balanceAfterFrom },
        to: { accountNumber: to.accountNumber },
      };
    });

    // Invalidate cached balances for both wallets + store idempotent result.
    await Promise.all([
      redis.del(`wallet:${result.fromWalletId}:balance`),
      redis.del(`wallet:${result.toWalletId}:balance`),
      redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 5),
    ]);

    return result;
  }

  /** The logged-in user's transactions across all their wallets (paginated). */
  async getMyTransactions(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: { id: true },
    });
    const walletIds = wallets.map((w) => w.id);
    const where = { walletId: { in: walletIds } };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions: await this.enrich(transactions),
      pagination: this.paginate(total, page, limit),
    };
  }

  async getWalletTransactions(
    walletId: string,
    userId: string,
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new AppError("Wallet not found", 404);
    if (wallet.userId !== userId)
      throw new AppError("Unauthorized wallet access", 403);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { walletId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: { walletId } }),
    ]);

    return {
      transactions: await this.enrich(transactions),
      pagination: this.paginate(total, page, limit),
    };
  }

  private paginate(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Enrich raw transactions with their ledger detail: a human description,
   * direction, running balance, and the resolved counterparty (account + name).
   * So a feed can read: "Sent ₦2,500 to Bola (1000000002)".
   */
  private async enrich(transactions: RawTransaction[]) {
    if (transactions.length === 0) return [];

    // 1. Pull the matching ledger entries in one query.
    const ledgers = await prisma.ledger.findMany({
      where: { referenceId: { in: transactions.map((t) => t.id) } },
    });
    const ledgerByRef = new Map(ledgers.map((l) => [l.referenceId, l]));

    // 2. Resolve every counterparty account number to a name in one query.
    const counterAccounts = new Set<string>();
    for (const l of ledgers) {
      const match = l.description.match(ACCOUNT_NUMBER_RE);
      if (match) counterAccounts.add(match[1]);
    }
    const nameByAccount = new Map<string, string>();
    if (counterAccounts.size > 0) {
      const wallets = await prisma.wallet.findMany({
        where: { accountNumber: { in: [...counterAccounts] } },
        select: {
          accountNumber: true,
          user: { select: { email: true, kyc: { select: { fullName: true } } } },
        },
      });
      for (const w of wallets) {
        nameByAccount.set(
          w.accountNumber,
          deriveAccountName(w.user.email, w.user.kyc?.fullName)
        );
      }
    }

    // 3. Shape each item.
    return transactions.map((t) => {
      const ledger = ledgerByRef.get(t.id);
      const direction = t.type === "CREDIT" ? "in" : "out";
      const description =
        ledger?.description ?? (direction === "in" ? "Credit" : "Debit");
      const acct = ledger?.description.match(ACCOUNT_NUMBER_RE)?.[1] ?? null;

      return {
        id: t.id,
        type: t.type,
        direction, // "in" (received) | "out" (sent)
        amount: t.amount, // minor units
        description,
        counterparty: acct
          ? { accountNumber: acct, name: nameByAccount.get(acct) ?? null }
          : null,
        balanceAfter: ledger?.balanceAfter ?? null, // running balance, minor units
        createdAt: t.createdAt,
      };
    });
  }

  /** Admin: credit a wallet (e.g. manual top-up / adjustment). */
  async creditWallet(walletId: string, amount: bigint, reason: string) {
    if (amount <= 0n) throw new AppError("Amount must be positive", 400);

    const updatedWallet = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new AppError("Wallet not found", 404);

      const balanceBefore = wallet.balance;

      const updated = await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });

      const transaction = await tx.transaction.create({
        data: { walletId, type: "CREDIT", amount },
      });

      await tx.ledger.create({
        data: {
          walletId,
          referenceId: transaction.id,
          description: reason,
          amount,
          balanceBefore,
          balanceAfter: balanceBefore + amount,
          type: "CREDIT",
        },
      });

      return updated;
    });

    await redis.set(
      `wallet:${walletId}:balance`,
      updatedWallet.balance.toString()
    );

    return updatedWallet;
  }

  // System-wide transaction count + 24h trend for the dashboard.
  async getAllTransactionsStats() {
    const now = new Date();
    const todayStart = dayjs(now).subtract(24, "hour").toDate();
    const yesterdayStart = dayjs(now).subtract(48, "hour").toDate();
    const yesterdayEnd = dayjs(now).subtract(24, "hour").toDate();

    const [totalTransactions, todayTransactions, yesterdayTransactions] =
      await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({
          where: { createdAt: { gte: todayStart, lte: now } },
        }),
        prisma.transaction.count({
          where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        }),
      ]);

    const trend =
      yesterdayTransactions === 0
        ? 0
        : ((todayTransactions - yesterdayTransactions) /
            yesterdayTransactions) *
          100;

    const trendType = trend > 0 ? "up" : trend < 0 ? "down" : "neutral";

    return {
      title: "Total Transactions",
      value: totalTransactions,
      trend: Number(trend.toFixed(1)),
      trendType,
    };
  }

  // System-wide transaction volume (money moved) in the last 24h.
  async getTransactionVolume() {
    const now = new Date();
    const todayStart = dayjs(now).subtract(24, "hour").toDate();
    const yesterdayStart = dayjs(now).subtract(48, "hour").toDate();
    const yesterdayEnd = dayjs(now).subtract(24, "hour").toDate();

    const [todayVolume, yesterdayVolume] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: todayStart, lte: now } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      }),
    ]);

    const todayValue = todayVolume._sum.amount ?? 0n;
    const todayNum = Number(todayValue);
    const yesterdayNum = Number(yesterdayVolume._sum.amount ?? 0n);

    const trend =
      yesterdayNum === 0 ? 0 : ((todayNum - yesterdayNum) / yesterdayNum) * 100;
    const trendType = trend > 0 ? "up" : trend < 0 ? "down" : "neutral";

    return {
      title: "Transaction Volume",
      value: todayValue, // minor units moved in last 24h
      currency: "NGN",
      trend: Number(trend.toFixed(1)),
      trendType,
    };
  }

  // System-wide cashflow (total credits - total debits).
  async getTotalCashflow() {
    const [creditSum, debitSum] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "CREDIT" },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: "DEBIT" },
      }),
    ]);

    const totalCredit = creditSum._sum.amount ?? 0n;
    const totalDebit = debitSum._sum.amount ?? 0n;

    return {
      title: "Total Cashflow",
      value: totalCredit - totalDebit, // minor units, can be negative
      credit: totalCredit,
      debit: totalDebit,
      currency: "NGN",
    };
  }
}
