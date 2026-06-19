import { prisma } from "@core/config/prisma";
import { redis } from "@core/config/redis";
import { AppError } from "@core/errors/AppError";
import {
  generateAccountNumber,
  deriveAccountName,
} from "@core/utils/account";
import dayjs from "dayjs";

/**
 * WalletService owns wallet lifecycle + balance reads.
 * Money-movement (transfer/credit) lives in TransactionService.
 * All amounts are integer minor units (kobo). See utils/money.ts.
 */
export class WalletService {
  async createWallet(userId: string) {
    const existingWallet = await prisma.wallet.findFirst({ where: { userId } });

    if (existingWallet) {
      throw new AppError("Wallet already exists for this user", 400);
    }

    // Generate a unique account number, retrying on the (rare) collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.wallet.create({
          data: { userId, balance: 0n, accountNumber: generateAccountNumber() },
        });
      } catch (err: any) {
        if (err?.code === "P2002") continue; // unique violation -> retry
        throw err;
      }
    }
    throw new AppError("Could not allocate an account number, try again", 500);
  }

  /**
   * Name enquiry: resolve an account number to its holder's display name so a
   * sender can confirm the recipient before transferring. Does NOT leak balance
   * or email.
   */
  async resolveAccount(accountNumber: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { accountNumber },
      include: { user: { select: { email: true, kyc: { select: { fullName: true } } } } },
    });
    if (!wallet) throw new AppError("Account not found", 404);

    return {
      accountNumber: wallet.accountNumber,
      accountName: deriveAccountName(wallet.user.email, wallet.user.kyc?.fullName),
    };
  }

  async getMyWallets(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.wallet.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      wallets,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async deleteWallet(walletId: string, userId: string) {
    const result = await prisma.wallet.deleteMany({
      where: { id: walletId, userId },
    });

    if (result.count === 0)
      throw new AppError("Wallet not found or unauthorized", 404);

    await redis.del(`wallet:${walletId}:balance`);

    return { message: "Wallet deleted" };
  }

  async getBalance(walletId: string, userId: string): Promise<bigint> {
    const cacheKey = `wallet:${walletId}:balance`;
    const cached = await redis.get(cacheKey);

    if (cached !== null) return BigInt(cached);

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new AppError("Wallet not found", 404);

    if (wallet.userId !== userId) {
      throw new AppError("Unauthorized wallet access", 403);
    }

    await redis.set(cacheKey, wallet.balance.toString());
    return wallet.balance;
  }

  /** Admin dashboard: aggregate balance across all wallets + 24h deposit trend. */
  async getAllWalletsBalance() {
    const now = new Date();
    const todayStart = dayjs(now).startOf("day").toDate();
    const todayEnd = dayjs(now).endOf("day").toDate();
    const yesterdayStart = dayjs(now)
      .subtract(1, "day")
      .startOf("day")
      .toDate();
    const yesterdayEnd = dayjs(now).subtract(1, "day").endOf("day").toDate();

    const [totalBalance, walletCount, todayDeposits, yesterdayDeposits] =
      await Promise.all([
        prisma.wallet.aggregate({ _sum: { balance: true } }),
        prisma.wallet.count(),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { type: "CREDIT", createdAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: "CREDIT",
            createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
          },
        }),
      ]);

    // Convert to Number only for the percentage math (display-only).
    const currentValue = Number(todayDeposits._sum.amount ?? 0n);
    const previousValue = Number(yesterdayDeposits._sum.amount ?? 0n);

    const trend =
      previousValue === 0
        ? 0
        : ((currentValue - previousValue) / previousValue) * 100;

    const trendType =
      currentValue > previousValue
        ? "up"
        : currentValue < previousValue
        ? "down"
        : "neutral";

    return {
      title: "Total Wallet Balance",
      value: totalBalance._sum.balance ?? 0n, // minor units
      currency: "NGN",
      wallets: walletCount,
      trend: Number(trend.toFixed(1)),
      trendType,
    };
  }
}
