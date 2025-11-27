import { Router } from "express";
import { KycController } from "./kyc.controller";
import { isAdmin } from "@core/middleware/isAdmin";
import { authenticate } from "@core/middleware/auth.middleware";
import { validate } from "@core/middleware/validate";
import { submitKycSchema } from "./kyc.schema";
import asyncHandler from "express-async-handler";

const router = Router();
const kycController = new KycController();

// ✅ User routes
router.post(
  "/submit",
  authenticate,
  validate(submitKycSchema),
  kycController.submitKyc
);
router.get("/status", authenticate, asyncHandler(kycController.getMyKyc));

export const kycRouter = router;
