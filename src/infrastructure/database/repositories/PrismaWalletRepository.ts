import { Wallet, Prisma } from "@prisma/client";
import { prisma } from "@core/config/prisma";
import {
  IWalletRepository,
  CreateWalletData,
  UpdateWalletData,
  WalletFilters,
  WalletOperation,
} from "@application/interfaces/repositories/IWalletRepository";
import { AppError } from "@core/errors/AppError";

/**
 * Prisma Implementation of Wallet Repository
 * 
 * Handles wallet persistence with special focus on
 * atomic balance operations and transactional integrity.
 */
export class PrismaWalletRepository implements IWalletRepository {
  /**
   * Find wallet by ID
   */
  async findById(id: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({
      where: { id },
    });
  }

  /**
   * Find wallet by user ID
   */
  async findByUserId(userId: string): Promise<Wallet | null> {
    return prisma.wallet.findFirst({
      where: { userId },
    });
  }

  /**
   * Find wallet with user details
   */
  async findByIdWithUser(id: string): Promise<Wallet | null> {
    return prisma.wallet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }) as any;
  }

  /**
   * Find many wallets with filters
   */
  async findMany(filters: WalletFilters = {}): Promise<Wallet[]> {
    const where = this.buildWhereClause(filters);

    return prisma.wallet.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Count wallets
   */
  async count(filters: WalletFilters = {}): Promise<number> {
    const where = this.buildWhereClause(filters);
    return prisma.wallet.count({ where });
  }

  /**
   * Create new wallet
   */
  async create(data: CreateWalletData): Promise<Wallet> {
    return prisma.wallet.create({
      data: {
        userId: data.userId,
        currency: data.currency || "NGN",
        balance: data.balance || 0,
      },
    });
  }

  /**
   * Update wallet
   */
  async update(id: string, data: UpdateWalletData): Promise<Wallet> {
    return prisma.wallet.update({
      where: { id },
      data: {
        ...(data.balance !== undefined && { balance: data.balance }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  /**
   * Delete wallet
   */
  async delete(id: string): Promise<void> {
    await prisma.wallet.delete({
      where: { id },
    });
  }

  /**
   * Check if wallet exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await prisma.wallet.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * Update wallet balance (atomic operation)
   */
  async updateBalance(id: string, newBalance: number): Promise<void> {
    await prisma.wallet.update({
      where: { id },
      data: { balance: newBalance },
    });
  }

  /**
   * Increment wallet balance
   */
  async incrementBalance(id: string, amount: number): Promise<Wallet> {
    if (amount <= 0) {
      throw new AppError("Amount must be positive", 400);
    }

    return prisma.wallet.update({
      where: { id },
      data: {
        balance: { increment: amount },
      },
    });
  }

  /**
   * Decrement wallet balance
   */
  async decrementBalance(id: string, amount: number): Promise<Wallet> {
    if (amount <= 0) {
      throw new AppError("Amount must be positive", 400);
    }

    // Check sufficient balance first
    const wallet = await this.findById(id);
    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    if (wallet.balance < amount) {
      throw new AppError("Insufficient funds", 400);
    }

    return prisma.wallet.update({
      where: { id },
      data: {
        balance: { decrement: amount },
      },
    });
  }

  /**
   * Execute multiple wallet operations in a transaction
   * Essential for transfers to maintain consistency
   */
  async executeTransaction(operations: WalletOperation[]): Promise<void> {
    await prisma.$transaction(
      operations.map((op) =>
        prisma.wallet.update({
          where: { id: op.walletId },
          data: {
            balance: { increment: op.amount }, // Negative for debit, positive for credit
          },
        })
      )
    );
  }

  /**
   * Get wallet balance
   */
  async getBalance(id: string): Promise<number> {
    const wallet = await prisma.wallet.findUnique({
      where: { id },
      select: { balance: true },
    });

    if (!wallet) {
      throw new AppError("Wallet not found", 404);
    }

    return wallet.balance;
  }

  /**
   * Freeze wallet (prevent transactions)
   */
  async freeze(id: string): Promise<void> {
    await prisma.wallet.update({
      where: { id },
      data: { status: "FROZEN" },
    });
  }

  /**
   * Unfreeze wallet
   */
  async unfreeze(id: string): Promise<void> {
    await prisma.wallet.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: WalletFilters): Prisma.WalletWhereInput {
    return {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.currency && { currency: filters.currency }),
      ...(filters.status && { status: filters.status }),
    };
  }
}
