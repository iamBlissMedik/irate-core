import { Wallet } from "@generated/client/client";
import { IBaseRepository } from "./IBaseRepository";

/**
 * Wallet creation data
 */
export interface CreateWalletData {
  userId: string;
  balance?: number;
}

/**
 * Wallet update data
 */
export interface UpdateWalletData {
  balance?: number;
}

/**
 * Wallet query filters
 */
export interface WalletFilters {
  userId?: string;
  skip?: number;
  take?: number;
}

/**
 * Wallet operation for transactions
 */
export interface WalletOperation {
  walletId: string;
  amount: number; // Positive for credit, negative for debit
}

/**
 * Wallet Repository Interface
 *
 * Handles all wallet-related data operations including
 * balance updates and transaction management.
 */
export interface IWalletRepository extends IBaseRepository<
  Wallet,
  CreateWalletData,
  UpdateWalletData
> {
  /**
   * Find wallet by user ID
   */
  findByUserId(userId: string): Promise<Wallet | null>;

  /**
   * Find wallet by ID with user details
   */
  findByIdWithUser(id: string): Promise<Wallet | null>;

  /**
   * Update wallet balance (atomic operation)
   */
  updateBalance(id: string, newBalance: number): Promise<void>;

  /**
   * Increment balance (for deposits)
   */
  incrementBalance(id: string, amount: number): Promise<Wallet>;

  /**
   * Decrement balance (for withdrawals)
   */
  decrementBalance(id: string, amount: number): Promise<Wallet>;

  /**
   * Execute multiple wallet operations in a transaction
   * Used for transfers between wallets
   */
  executeTransaction(operations: WalletOperation[]): Promise<void>;

  /**
   * Get wallet balance
   */
  getBalance(id: string): Promise<number>;
}
