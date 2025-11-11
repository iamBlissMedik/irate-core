import { Request, Response } from "express";
import { WalletService } from "./wallet.service";

const walletService = new WalletService();

export class WalletController {
  async create(req: Request, res: Response) {
    const userId = req.user.id;
    const wallet = await walletService.createWallet(userId);

    return res.status(201).json({
      success: true,
      message: "Wallet created successfully",
      data: wallet,
    });
  }

  async listMyWallets(req: Request, res: Response) {
    const userId = req.user?.id;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const wallets = await walletService.getMyWallets(userId, page, limit);

    return res.json({
      success: true,
      message: "Wallets retrieved",
      data: wallets,
    });
  }

  // ✅ Get Balance
  async getBalance(req: Request, res: Response) {
    const { walletId } = req.params;
    const userId = req.user.id;

    const balance = await walletService.getBalance(walletId, userId);

    return res.json({
      success: true,
      message: "Wallet balance retrieved",
      data: { walletId, balance },
    });
  }

  // ✅ Transfer Money
  async transfer(req: Request, res: Response) {
    const userId = req.user.id;
    const { fromWalletId, toWalletId, amount } = req.body;

    // Get Idempotency-Key from headers
    const idempotencyKey = req.headers["idempotency-key"]?.toString();

    const result = await walletService.transfer(
      fromWalletId,
      toWalletId,
      Number(amount),
      userId,
      idempotencyKey
    );

    return res.json({
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

    const result = await walletService.getWalletTransactions(
      walletId,
      userId,
      page,
      limit
    );

    return res.json({
      success: true,
      message: "Transaction history retrieved",
      data: result,
    });
  }

  //  ✅Admin: Credit Wallet
  async credit(req: Request, res: Response) {
    const { walletId } = req.params;
    const { amount, reason } = req.body;

    const result = await walletService.creditWallet(walletId, amount, reason);

    return res.status(200).json({
      message: "Wallet credited successfully",
      wallet: result,
    });
  }
}
