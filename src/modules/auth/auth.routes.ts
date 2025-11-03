import { Router } from "express";
import asyncHandler from "express-async-handler";
import { AuthController } from "./auth.controller";

const router = Router();
const controller = new AuthController();

router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));

export { router as authRouter };
