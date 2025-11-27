import { Router } from "express";
import { authenticate } from "@core/middleware/auth.middleware";
import { validate } from "@core/middleware/validate";
import { transferSchema } from "./transaction.schema";
import asyncHandler from "express-async-handler";
import { TransactionController } from "./transaction.controller";

const router = Router();
const transactionController = new TransactionController();

router.post(
  "/transfer",
  authenticate,
  validate(transferSchema),
  asyncHandler(transactionController.transfer)
);
router.get(
  "/:walletId/transactions",
  authenticate,
  asyncHandler(transactionController.listTransactions)
);

export const transactionRouter = router;
