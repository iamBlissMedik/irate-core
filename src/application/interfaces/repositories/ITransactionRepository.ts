import { Transaction } from "@prisma/client";
import { IBaseRepository } from "./IBaseRepository";

/**
 * Transaction creation data
 */
export interface CreateTransactionData {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  type: string;
  status?: string;
  reference?: string;
  description?: string;
  metadata?: any;
}

/**
 * Transaction update data
 */
export interface UpdateTransactionData {
  status?: string;
  metadata?: any;
}

/**
 * Transaction query filters
 */
export interface TransactionFilters {
  walletId?: string;
  userId?: string;
  type?: string;
  status?: string;
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
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
}

/**
 * Transaction Repository Interface
 * 
 * Manages transaction records including creation,
 * querying, and statistics generation.
 */
export interface ITransactionRepository
  extends IBaseRepository<
    Transaction,
    CreateTransactionData,
    UpdateTransactionData
  > {
  /**
   * Find transactions by wallet ID
   */
  findByWalletId(walletId: string, filters?: TransactionFilters): Promise<Transaction[]>;

  /**
   * Find transactions by user ID (across all user's wallets)
   */
  findByUserId(userId: string, filters?: TransactionFilters): Promise<Transaction[]>;

  /**
   * Find transaction by reference number
   */
  findByReference(reference: string): Promise<Transaction | null>;

  /**
   * Get transaction history with pagination
   */
  getHistory(
    filters: TransactionFilters
  ): Promise<{ transactions: Transaction[]; total: number }>;

  /**
   * Get transaction statistics for a wallet
   */
  getStats(walletId: string, fromDate?: Date, toDate?: Date): Promise<TransactionStats>;

  /**
   * Update transaction status
   */
  updateStatus(id: string, status: string): Promise<Transaction>;

  /**
   * Check if reference exists (for idempotency)
   */
  referenceExists(reference: string): Promise<boolean>;

  /**
   * Get recent transactions
   */
  getRecent(walletId: string, limit?: number): Promise<Transaction[]>;
}
