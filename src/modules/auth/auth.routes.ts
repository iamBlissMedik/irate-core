import { Router } from "express";
import asyncHandler from "express-async-handler";
import { AuthController } from "./auth.controller";
import { authenticate } from "@core/middleware/auth.middleware";
import { validate } from "@core/middleware/validate";
import { loginSchema, registerSchema } from "./auth.schema";

const router = Router();
const controller = new AuthController();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(controller.register)
);
router.post("/login", validate(loginSchema), asyncHandler(controller.login));
router.post("/refresh", asyncHandler(controller.refresh));
router.post("/logout", authenticate, asyncHandler(controller.logout));

export { router as authRouter };
