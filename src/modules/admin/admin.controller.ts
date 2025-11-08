import { Request, Response } from "express";
import { WalletService } from "@modules/wallet/wallet.service";

const walletService = new WalletService();

export class AdminWalletController {
  async credit(req: Request, res: Response) {
    const { walletId, amount } = req.body;

    const updatedWallet = await walletService.creditWallet(
      walletId,
      Number(amount)
    );

    return res.json({
      success: true,
      message: "Wallet credited successfully",
      data: updatedWallet,
    });
  }
}
