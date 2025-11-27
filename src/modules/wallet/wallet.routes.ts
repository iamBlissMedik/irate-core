import { Router } from "express";
import { WalletController } from "./wallet.controller";
import { authenticate } from "@core/middleware/auth.middleware";
import asyncHandler from "express-async-handler";

const router = Router();
const walletController = new WalletController();

router.post("/", authenticate, walletController.create);

router.get("/", authenticate, asyncHandler(walletController.listMyWallets));
router.get(
  "/:walletId/balance",
  authenticate,
  asyncHandler(walletController.getBalance)
);

export const walletRouter = router;
