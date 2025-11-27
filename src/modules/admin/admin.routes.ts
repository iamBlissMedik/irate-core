import { Router } from "express";
import { authenticate } from "@core/middleware/auth.middleware";
import { isAdmin } from "@core/middleware/isAdmin";
import { WalletController } from "@modules/wallet/wallet.controller";
import { KycController } from "@modules/kyc/kyc.controller";
import { UserController } from "@modules/user/user.controller";
import { validate } from "@core/middleware/validate";
import { creditSchema } from "./admin.schema";
import { reviewKycSchema } from "@modules/kyc/kyc.schema";
import asyncHandler from "express-async-handler";
import { AdminController } from "./admin.controller";
import { TransactionController } from "@modules/transaction/transaction.controller";
const walletController = new WalletController();
const kycController = new KycController();
const userController = new UserController();
const adminController = new AdminController();
const transactionController = new TransactionController();
const router = Router();

router.post(
  "/credit/:walletId",
  authenticate,
  isAdmin,
  validate(creditSchema),
  asyncHandler(transactionController.credit)
);

router.get("/kyc", authenticate, isAdmin, asyncHandler(kycController.listKycs));
router.get(
  "/users",
  authenticate,
  isAdmin,
  asyncHandler(userController.getAllUsers)
);
router.get(
  "/wallets/balance",
  authenticate,
  isAdmin,
  asyncHandler(walletController.getAllWalletsBalance)
);
router.get(
  "/users/stats",
  authenticate,
  isAdmin,
  asyncHandler(userController.getAllUsersStats)
);
router.get(
  "/dashboard/overview",
  authenticate,
  isAdmin,
  asyncHandler(adminController.getDashboardOverview)
);



router.patch(
  "/kyc/:kycId/review",
  authenticate,
  isAdmin,
  validate(reviewKycSchema),
  asyncHandler(kycController.reviewKyc)
);

export const adminWalletRouter = router;
