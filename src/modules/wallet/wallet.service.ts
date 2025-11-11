import { prisma } from "@core/config/prisma";
import { redis } from "@core/config/redis";
import { AppError } from "@core/errors/AppError";

export class WalletService {
  async createWallet(userId: string) {
    const existingWallet = await prisma.wallet.findFirst({ where: { userId } });

    if (existingWallet) {
      throw new AppError("Wallet already exists for this user", 400);
    }

    return prisma.wallet.create({
      data: { userId, balance: 0 },
    });
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

  async getBalance(walletId: string, userId: string) {
    const cacheKey = `wallet:${walletId}:balance`;
    const cached = await redis.get(cacheKey);

    if (cached !== null) return Number(cached);

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new AppError("Wallet not found", 404);

    if (wallet.userId !== userId) {
      throw new AppError("Unauthorized wallet access", 403);
    }

    await redis.set(cacheKey, wallet.balance.toString());
    return wallet.balance;
  }

  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    userId: string,
    idempotencyKey?: string
  ) {
    if (amount <= 0) throw new AppError("Amount must be positive.");

    // ✅ Idempotency Required
    if (!idempotencyKey) {
      throw new AppError("Idempotency-Key header is required.", 400);
    }

    const cacheKey = `idem:${idempotencyKey}`;

    // ✅ If this request was already processed, return stored result
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    // ✅ Perform transfer atomically
    const result = await prisma.$transaction(async (tx) => {
      const from = await tx.wallet.findUnique({ where: { id: fromWalletId } });
      const to = await tx.wallet.findUnique({ where: { id: toWalletId } });

      if (!from || !to) throw new AppError("Wallet not found.");

      // ✅ Ensure user owns wallet they are transferring from
      if (from.userId !== userId) {
        throw new AppError(
          "Unauthorized: You can only transfer from your own wallet.",
          403
        );
      }

      if (from.balance < amount)
        throw new AppError("Insufficient balance.", 400);

      const balanceBeforeFrom = from.balance;
      const balanceBeforeTo = to.balance;
      // Update balances
      const updatedFrom = await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount } },
      });

      const updatedTo = await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: amount } },
      });

      // Create transaction entries
      const debitTx = await tx.transaction.create({
        data: { walletId: fromWalletId, type: "DEBIT", amount },
      });

      const creditTx = await tx.transaction.create({
        data: { walletId: toWalletId, type: "CREDIT", amount },
      });

      // Create ledger entries
      await tx.ledger.create({
        data: {
          walletId: fromWalletId,
          referenceId: debitTx.id,
          description: `Transfer to wallet ${toWalletId}`,
          amount,
          balanceBefore: balanceBeforeFrom,
          balanceAfter: balanceBeforeFrom - amount,
          type: "DEBIT",
        },
      });

      await tx.ledger.create({
        data: {
          walletId: toWalletId,
          referenceId: creditTx.id,
          description: `Transfer from wallet ${fromWalletId}`,
          amount,
          balanceBefore: balanceBeforeTo,
          balanceAfter: balanceBeforeTo + amount,
          type: "CREDIT",
        },
      });

      // Cache wallet balances
      await redis.set(
        `wallet:${fromWalletId}:balance`,
        updatedFrom.balance.toString()
      );
      await redis.set(
        `wallet:${toWalletId}:balance`,
        updatedTo.balance.toString()
      );

      return { from: updatedFrom, to: updatedTo };
    });

    // ✅ Store result for 5 minutes to prevent double-transfer
    await redis.set(cacheKey, JSON.stringify(result), "EX", 60 * 5);

    return result;
  }

  async getWalletTransactions(
    walletId: string,
    userId: string,
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;

    // Ensure wallet belongs to user
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

    const totalPages = Math.ceil(total / limit);

    return {
      transactions,
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

  async creditWallet(walletId: string, amount: number, reason: string) {
    if (amount <= 0) throw new AppError("Amount must be positive");

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new AppError("Wallet not found", 404);

      const balanceBefore = wallet.balance;

      // Update balance
      const updatedWallet = await tx.wallet.update({
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
          description: reason, // <--- store reason here
          amount,
          balanceBefore,
          balanceAfter: balanceBefore + amount,
          type: "CREDIT",
        },
      });

      // Update cache
      await redis.set(
        `wallet:${walletId}:balance`,
        updatedWallet.balance.toString()
      );

      return updatedWallet;
    });
  }
}
