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

    res.json({
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

    res.json({
      success: true,
      message: "Wallet balance retrieved",
      data: { walletId, balance },
    });
  }

  async getAllWalletsBalance(req: Request, res: Response) {
    const userId = req.user.id;
    const stats = await walletService.getAllWalletsBalance();

    res.status(200).json({ success: true, data: stats });
  }
}
