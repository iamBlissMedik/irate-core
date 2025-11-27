import { Request, Response } from "express";
import { auditLog } from "@core/utils/auditLogger";
import { TransactionService } from "./transaction.service";

const transactionService = new TransactionService();

export class TransactionController {
  // ✅ Transfer Money
  async transfer(req: Request, res: Response) {
    const userId = req.user.id;
    const { fromWalletId, toWalletId, amount } = req.body;

    // Get Idempotency-Key from headers
    const idempotencyKey = req.headers["idempotency-key"]?.toString();

    const result = await transactionService.transfer(
      fromWalletId,
      toWalletId,
      Number(amount),
      userId,
      idempotencyKey
    );
    await auditLog("WALLET_TRANSFER", userId, { amount });
    res.json({
      success: true,
      message: "Transfer successful",
      data: result,
    });
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

    res.json({
      success: true,
      message: "Transaction history retrieved",
      data: result,
    });
  }

  //  ✅Admin: Credit Wallet
  async credit(req: Request, res: Response) {
    const { walletId } = req.params;
    const { amount, reason } = req.body;

    const result = await transactionService.creditWallet(
      walletId,
      amount,
      reason
    );

    res.status(200).json({
      message: "Wallet credited successfully",
      wallet: result,
    });
  }
}
