import { TransactionService } from "@modules/transaction/transaction.service";
import { UserService } from "@modules/user/user.service";
import { WalletService } from "@modules/wallet/wallet.service";

const userService = new UserService();
const walletService = new WalletService();
const transactionService = new TransactionService();
export class AdminService {
  // DASHBOARD OVERVIEW
  async getDashboardOverview() {
    const [usersStats, walletsBalance,transactionStats] = await Promise.all([
      userService.getAllUsersStats(),
      walletService.getAllWalletsBalance(),
      transactionService.getAllTransactionsStats(),
    ]);
    return {
      usersStats,
      walletsBalance,
      transactionStats,
    };
  }
}
