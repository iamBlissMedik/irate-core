import { Router } from "express";
import { WalletController } from "./wallet.controller";
import { authenticate } from "@core/middleware/auth.middleware";
import { validate } from "@core/middleware/validate";
import { transferSchema } from "./wallet.schema";

const router = Router();
const walletController = new WalletController();

router.post("/", authenticate, walletController.create);
router.get("/", authenticate, walletController.listMyWallets);
router.get("/:walletId/balance", authenticate, walletController.getBalance);
router.post(
  "/transfer",
  authenticate,
  validate(transferSchema),
  walletController.transfer
);
router.get(
  "/:walletId/transactions",
  authenticate,
  walletController.listTransactions
);

export const walletRouter = router;
