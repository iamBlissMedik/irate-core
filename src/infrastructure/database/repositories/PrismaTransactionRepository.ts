import { Transaction, Prisma } from "@prisma/client";
import { prisma } from "@core/config/prisma";
import {
  ITransactionRepository,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
  TransactionStats,
} from "@application/interfaces/repositories/ITransactionRepository";

/**
 * Prisma Implementation of Transaction Repository
 * 
 * Manages transaction records with filtering, statistics,
 * and reference-based idempotency checks.
 */
export class PrismaTransactionRepository implements ITransactionRepository {
  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        fromWallet: {
          include: { user: true },
        },
        toWallet: {
          include: { user: true },
        },
      },
    });
  }

  /**
   * Find transactions by wallet ID
   */
  async findByWalletId(
    walletId: string,
    filters: TransactionFilters = {}
  ): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
        ...this.buildWhereClause(filters),
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });
  }

  /**
   * Find transactions by user ID (across all wallets)
   */
  async findByUserId(
    userId: string,
    filters: TransactionFilters = {}
  ): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        OR: [
          { fromWallet: { userId } },
          { toWallet: { userId } },
        ],
        ...this.buildWhereClause(filters),
      },
      include: {
        fromWallet: true,
        toWallet: true,
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });
  }

  /**
   * Find transaction by reference
   */
  async findByReference(reference: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { reference },
    });
  }

  /**
   * Get transaction history with pagination
   */
  async getHistory(
    filters: TransactionFilters
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const where = this.buildWhereClause(filters);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
        include: {
          fromWallet: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          toWallet: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  /**
   * Get transaction statistics
   */
  async getStats(
    walletId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<TransactionStats> {
    const where: Prisma.TransactionWhereInput = {
      OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && { createdAt: { lte: toDate } }),
    };

    const [totalTransactions, successfulTransactions, failedTransactions, pendingTransactions, sumResult] =
      await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.count({
          where: { ...where, status: "SUCCESS" },
        }),
        prisma.transaction.count({
          where: { ...where, status: "FAILED" },
        }),
        prisma.transaction.count({
          where: { ...where, status: "PENDING" },
        }),
        prisma.transaction.aggregate({
          where: { ...where, status: "SUCCESS" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalTransactions,
      totalAmount: sumResult._sum.amount || 0,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
    };
  }

  /**
   * Find many transactions
   */
  async findMany(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const where = this.buildWhereClause(filters);

    return prisma.transaction.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Count transactions
   */
  async count(filters: TransactionFilters = {}): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.transaction.count({ where });
  }

  /**
   * Create new transaction
   */
  async create(data: CreateTransactionData): Promise<Transaction> {
    return prisma.transaction.create({
      data: {
        fromWalletId: data.fromWalletId,
        toWalletId: data.toWalletId,
        amount: data.amount,
        type: data.type,
        status: data.status || "PENDING",
        reference: data.reference || this.generateReference(),
        description: data.description,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Update transaction
   */
  async update(id: string, data: UpdateTransactionData): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.metadata && { metadata: data.metadata }),
      },
    });
  }

  /**
   * Update transaction status
   */
  async updateStatus(id: string, status: string): Promise<Transaction> {
    return prisma.transaction.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Delete transaction
   */
  async delete(id: string): Promise<void> {
    await prisma.transaction.delete({
      where: { id },
    });
  }

  /**
   * Check if transaction exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.transaction.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Check if reference exists (for idempotency)
   */
  async referenceExists(reference: string): Promise<boolean> {
    const count = await prisma.transaction.count({
      where: { reference },
    });
    return count > 0;
  }

  /**
   * Get recent transactions
   */
  async getRecent(walletId: string, limit: number = 10): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        OR: [{ fromWalletId: walletId }, { toWalletId: walletId }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        fromWallet: {
          include: { user: true },
        },
        toWallet: {
          include: { user: true },
        },
      },
    });
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: TransactionFilters): Prisma.TransactionWhereInput {
    return {
      ...(filters.walletId && {
        OR: [
          { fromWalletId: filters.walletId },
          { toWalletId: filters.walletId },
        ],
      }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.fromDate && { createdAt: { gte: filters.fromDate } }),
      ...(filters.toDate && { createdAt: { lte: filters.toDate } }),
      ...(filters.minAmount && { amount: { gte: filters.minAmount } }),
      ...(filters.maxAmount && { amount: { lte: filters.maxAmount } }),
    };
  }

  /**
   * Generate unique transaction reference
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9).toUpperCase();
    return `TXN-${timestamp}-${random}`;
  }
}
