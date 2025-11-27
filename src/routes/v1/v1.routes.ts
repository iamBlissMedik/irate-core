import { adminWalletRouter } from "@modules/admin/admin.routes";
import { authRouter } from "@modules/auth/auth.routes";
import { kycRouter } from "@modules/kyc/kyc.routes";
import { transactionRouter } from "@modules/transaction/transaction.routes";
import { userRouter } from "@modules/user/user.route";
import { walletRouter } from "@modules/wallet/wallet.routes";
import { Router } from "express";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/wallets", walletRouter);
router.use("/transactions", transactionRouter);
router.use("/kyc", kycRouter);
router.use("/admin", adminWalletRouter);

export const v1Router = router;
