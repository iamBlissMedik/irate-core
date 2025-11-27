import { TransactionService } from "@modules/transaction/transaction.service";
import { UserService } from "@modules/user/user.service";
import { WalletService } from "@modules/wallet/wallet.service";

const userService = new UserService();
const walletService = new WalletService();
const transactionService = new TransactionService();
export class AdminService {
  // DASHBOARD OVERVIEW
  async getDashboardOverview() {
    const [
      usersStats,
      walletsBalance,
      transactionStats,
      totalCashflow,
      transactionVolume,
    ] = await Promise.all([
      userService.getAllUsersStats(),
      walletService.getAllWalletsBalance(),
      transactionService.getAllTransactionsStats(),
      transactionService.getTotalCashflow(),
      transactionService.getTransactionVolume(),
    ]);
    return {
      usersStats,
      walletsBalance,
      transactionStats,
      totalCashflow,
      transactionVolume,
    };
  }
  /**
   * Get current admin user details
   */
  async getAdminMe(
    adminId: string,
    walletPage = 1,
    walletLimit = 10,
    txPage = 1,
    txLimit = 5
  ) {
    // Reuse UserService.getUser to get wallets + transactions
    const admin = await userService.getUser(
      adminId,
      walletPage,
      walletLimit,
      txPage,
      txLimit
    );

    // Optionally, validate role
    if (admin.role !== "ADMIN") {
      throw new Error("Unauthorized: Not an admin");
    }

    return admin;
  }
}
