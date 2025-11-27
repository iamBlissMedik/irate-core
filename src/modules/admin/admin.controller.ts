import { Request, Response } from "express";
import { sendResponse } from "@core/utils/response";
import { AdminService } from "./admin.service";

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
}
