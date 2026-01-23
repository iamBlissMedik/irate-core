import { Transaction, Prisma } from "@generated/client/client";
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
 * Manages transaction records with filtering and statistics.
 */
export class PrismaTransactionRepository implements ITransactionRepository {
  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        wallet: {
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
    filters: TransactionFilters = {},
  ): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: {
        walletId,
        ...this.buildWhereClause(filters),
      },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });
  }

  /**
   * Get transaction history with pagination
   */
  async getHistory(
    filters: TransactionFilters,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const where = this.buildWhereClause(filters);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
        include: {
          wallet: {
            select: {
              id: true,
              user: {
                select: {
                  email: true,
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
    toDate?: Date,
  ): Promise<TransactionStats> {
    const where: Prisma.TransactionWhereInput = {
      walletId,
      ...(fromDate && { createdAt: { gte: fromDate } }),
      ...(toDate && { createdAt: { lte: toDate } }),
    };

    const [totalTransactions, creditSum, debitSum] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where: { ...where, type: "CREDIT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: "DEBIT" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalTransactions,
      totalAmount: (creditSum._sum.amount || 0) + (debitSum._sum.amount || 0),
      creditAmount: creditSum._sum.amount || 0,
      debitAmount: debitSum._sum.amount || 0,
    };
  }

  /**
   * Get recent transactions
   */
  async getRecent(
    walletId: string,
    limit: number = 10,
  ): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: { walletId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
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
        walletId: data.walletId,
        amount: data.amount,
        type: data.type as any, // TransactionType enum
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
        ...(data.type && { type: data.type as any }),
        ...(data.amount !== undefined && { amount: data.amount }),
      },
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
   * Build Prisma where clause from filters
   */
  private buildWhereClause(
    filters: TransactionFilters,
  ): Prisma.TransactionWhereInput {
    return {
      ...(filters.walletId && { walletId: filters.walletId }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.fromDate && { createdAt: { gte: filters.fromDate } }),
      ...(filters.toDate && { createdAt: { lte: filters.toDate } }),
      ...(filters.minAmount && { amount: { gte: filters.minAmount } }),
      ...(filters.maxAmount && { amount: { lte: filters.maxAmount } }),
    };
  }
}
