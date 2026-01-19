import { Transaction } from "@generated/client/client";
import { IBaseRepository } from "./IBaseRepository";

/**
 * Transaction creation data
 */
export interface CreateTransactionData {
  walletId: string;
  amount: number;
  type: string;
}

/**
 * Transaction update data
 */
export interface UpdateTransactionData {
  // Transactions are typically immutable, but keeping interface for flexibility
  type?: string;
  amount?: number;
}

/**
 * Transaction query filters
 */
export interface TransactionFilters {
  walletId?: string;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  skip?: number;
  take?: number;
}

/**
 * Transaction statistics
 */
export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  creditAmount: number;
  debitAmount: number;
}

/**
 * Transaction Repository Interface
 *
 * Manages transaction records including creation,
 * querying, and statistics generation.
 */
export interface ITransactionRepository extends IBaseRepository<
  Transaction,
  CreateTransactionData,
  UpdateTransactionData
> {
  /**
   * Find transactions by wallet ID
   */
  findByWalletId(
    walletId: string,
    filters?: TransactionFilters,
  ): Promise<Transaction[]>;

  /**
   * Get transaction history with pagination
   */
  getHistory(
    filters: TransactionFilters,
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Get transaction statistics for a wallet
   */
  getStats(
    walletId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<TransactionStats>;

  /**
   * Get recent transactions
   */
  getRecent(walletId: string, limit?: number): Promise<Transaction[]>;
}
