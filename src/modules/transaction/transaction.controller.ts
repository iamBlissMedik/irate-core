import { Request, Response } from "express";
import { auditLog } from "@core/utils/auditLogger";
import { sendResponse } from "@core/utils/response";
import { parseAmount } from "@core/utils/money";
import { WalletService } from "@modules/wallet/wallet.service";
import { TransactionService } from "./transaction.service";

const transactionService = new TransactionService();
const walletService = new WalletService();

export class TransactionController {
  // ✅ Send money to a recipient by account number (amount in minor units).
  async transfer(req: Request, res: Response) {
    const userId = req.user.id;
    const { toAccountNumber, amount } = req.body;
    const idempotencyKey = req.headers["idempotency-key"]?.toString();

    const result = await transactionService.transfer(
      userId,
      toAccountNumber,
      parseAmount(amount),
      idempotencyKey
    );

    await auditLog("WALLET_TRANSFER", userId, { toAccountNumber, amount });

    sendResponse(res, 200, true, "Transfer successful", result);
  }

  // ✅ Name enquiry: confirm a recipient's name before sending.
  async resolveAccount(req: Request, res: Response) {
    const { accountNumber } = req.params;
    const result = await walletService.resolveAccount(accountNumber);
    sendResponse(res, 200, true, "Account resolved", result);
  }

  // ✅ The logged-in user's full transaction history (all their wallets).
  async listMyTransactions(req: Request, res: Response) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await transactionService.getMyTransactions(
      req.user.id,
      page,
      limit
    );

    sendResponse(res, 200, true, "Transaction history retrieved", result);
  }

  async listTransactions(req: Request, res: Response) {
    const userId = req.user.id;
    const { walletId } = req.params;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await transactionService.getWalletTransactions(
      walletId,
      userId,
      page,
      limit
    );

    sendResponse(res, 200, true, "Transaction history retrieved", result);
  }

  // ✅ Admin: credit a wallet (amount in minor units).
  async credit(req: Request, res: Response) {
    const { walletId } = req.params;
    const { amount, reason } = req.body;

    const result = await transactionService.creditWallet(
      walletId,
      parseAmount(amount),
      reason
    );

    await auditLog("ADMIN_CREDIT", req.user.id, { walletId, amount, reason });

    sendResponse(res, 200, true, "Wallet credited successfully", result);
  }
}
