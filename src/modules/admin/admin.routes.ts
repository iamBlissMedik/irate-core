import { Router } from "express";
import { AdminWalletController } from "./admin.controller";

const router = Router();
const adminWalletController = new AdminWalletController();

router.post("/credit", adminWalletController.credit);

export const adminWalletRouter = router;
