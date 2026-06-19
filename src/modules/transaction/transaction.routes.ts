import { Router } from "express";
import { authenticate } from "@core/middleware/auth.middleware";
import { validate } from "@core/middleware/validate";
import { transferSchema } from "./transaction.schema";
import asyncHandler from "express-async-handler";
import { TransactionController } from "./transaction.controller";

const router = Router();
const transactionController = new TransactionController();

// Name enquiry — resolve an account number to its holder's name before sending.
router.get(
  "/resolve/:accountNumber",
  authenticate,
  asyncHandler(transactionController.resolveAccount)
);

router.post(
  "/transfer",
  authenticate,
  validate(transferSchema),
  asyncHandler(transactionController.transfer)
);
// My full transaction history (across all my wallets).
router.get(
  "/me",
  authenticate,
  asyncHandler(transactionController.listMyTransactions)
);
router.get(
  "/:walletId/transactions",
  authenticate,
  asyncHandler(transactionController.listTransactions)
);

export const transactionRouter = router;
