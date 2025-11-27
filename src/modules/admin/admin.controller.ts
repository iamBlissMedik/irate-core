import { Request, Response } from "express";
import { sendResponse } from "@core/utils/response";
import { AdminService } from "./admin.service";
import { AppError } from "@core/errors/AppError";

const adminService = new AdminService();
export class AdminController {
  async getDashboardOverview(req: Request, res: Response) {
    const dashboardOverview = await adminService.getDashboardOverview();
    sendResponse(
      res,
      200,
      true,
      "dashboard overview fetched successfully",
      dashboardOverview
    );
  }
  async getAdminMe(req: Request, res: Response) {
    const adminId = req.user?.id; // comes from auth middleware
    if (!adminId)throw new AppError("Unauthorized", 401);

    const walletPage = parseInt(req.query.walletPage as string) || 1;
    const walletLimit = parseInt(req.query.walletLimit as string) || 10;
    const txPage = parseInt(req.query.txPage as string) || 1;
    const txLimit = parseInt(req.query.txLimit as string) || 5;

    const admin = await adminService.getAdminMe(
      adminId,
      walletPage,
      walletLimit,
      txPage,
      txLimit
    );

    sendResponse(res, 200, true, "Admin fetched successfully", admin);
  }
}
