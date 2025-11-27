import { Request, Response } from "express";
import { UserService } from "./user.service";
import { sendResponse } from "@core/utils/response";
import { AppError } from "@core/errors/AppError";

const userService = new UserService();
export class UserController {
  async getAllUsers(req: Request, res: Response) {
    const data = await userService.getAllUsers();
    sendResponse(res, 200, true, "Users retrieved successfully", data);
  }

  async getUser(req: Request, res: Response) {
    // If /me, use authenticated user ID
    const userId = req.params.userId || req.user?.id;
    if (!userId) throw new AppError("Unauthorized", 401);

    // Pagination query params (optional)
    const walletPage = parseInt(req.query.walletPage as string) || 1;
    const walletLimit = parseInt(req.query.walletLimit as string) || 10;
    const txPage = parseInt(req.query.txPage as string) || 1;
    const txLimit = parseInt(req.query.txLimit as string) || 5;

    const user = await userService.getUser(
      userId,
      walletPage,
      walletLimit,
      txPage,
      txLimit
    );
    sendResponse(res, 200, true, "User fetched successfully", user);
  }

  async getAllUsersStats(req: Request, res: Response) {
    const stats = await userService.getAllUsersStats();
    sendResponse(res, 200, true, "User stats fetched successfully", stats);
  }
}
