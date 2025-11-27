import { authenticate } from "@core/middleware/auth.middleware";
import { Router } from "express";
import { UserController } from "./user.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const userController = new UserController();

router.get("/me", authenticate, asyncHandler(userController.getUser));
router.get("/:userId", authenticate, asyncHandler(userController.getUser));

export const userRouter = router;
