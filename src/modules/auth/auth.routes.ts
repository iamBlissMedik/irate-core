import { Router } from "express";
import asyncHandler from "express-async-handler";
import { AuthController } from "./auth.controller";
import { authenticate } from "@core/middleware/auth.middleware";

const router = Router();
const controller = new AuthController();

router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));
router.post("/refresh", asyncHandler(controller.refresh));
router.post("/logout",authenticate, asyncHandler(controller.logout));

export { router as authRouter };
