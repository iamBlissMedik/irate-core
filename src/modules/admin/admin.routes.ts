import { Router } from "express";
import { authenticate } from "@core/middleware/auth.middleware";
import { isAdmin } from "@core/middleware/isAdmin";
import { WalletController } from "@modules/wallet/wallet.controller";
import { KycController } from "@modules/kyc/kyc.controller";
import { UserController } from "@modules/user/user.controller";
import { validate } from "@core/middleware/validate";
import { creditSchema } from "./admin.schema";
import { reviewKycSchema } from "@modules/kyc/kyc.schema";

const walletController = new WalletController();
const kycController = new KycController();
const userController = new UserController();
const router = Router();

router.post(
  "/credit/:walletId",
  authenticate,
  isAdmin,
  validate(creditSchema),
  walletController.credit
);

router.get("/kyc", authenticate, isAdmin, kycController.listKycs);
router.get("/users", authenticate, isAdmin, userController.getAllUsers);
router.patch(
  "/kyc/:kycId/review",
  authenticate,
  isAdmin,
  validate(reviewKycSchema),
  kycController.reviewKyc
);

export const adminWalletRouter = router;
