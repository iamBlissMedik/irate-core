import { authenticate } from "@core/middleware/auth.middleware";
import { Router } from "express";
import { UserController } from "./user.controller";

const router = Router();
const userController = new UserController();





router.get("/:userId", authenticate, userController.getUserById);

export const userRouter = router;