import { authenticate } from "@core/middleware/auth.middleware";
import { Router } from "express";
import { UserController } from "./user.controller";
import asyncHandler from "express-async-handler";

const router = Router();
const userController = new UserController();

router.get("/:userId", authenticate, asyncHandler(userController.getUserById));

export const userRouter = router;
