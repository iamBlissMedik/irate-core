import { Request, Response } from "express";
import { sendResponse } from "@core/utils/response";
import { KycService } from "./kyc.service";

const kycService = new KycService();

export class KycController {
  // ✅ User submits their KYC
  async submitKyc(req: Request, res: Response) {
    const userId = req.user.id;
    const { fullName, dateOfBirth, address, idType, idNumber, documentUrl } =
      req.body;

    const result = await kycService.submitKyc(userId, {
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      address,
      idType,
      idNumber,
      documentUrl,
    });

    sendResponse(res, 201, true, "KYC submitted successfully", result);
  }

  // ✅ User: get own KYC status
  async getMyKyc(req: Request, res: Response) {
    const userId = req.user.id;
    const result = await kycService.getMyKyc(userId);
    sendResponse(res, 200, true, "KYC retrieved", result);
  }

  // ✅ Admin: list all KYC with pagination + filtering
  async listKycs(req: Request, res: Response) {
    const { status, page = "1", limit = "10" } = req.query;

    const result = await kycService.listKycs(
      status as "PENDING" | "VERIFIED" | "REJECTED" | undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    sendResponse(res, 200, true, "KYC submissions retrieved", result);
  }

  // ✅ Admin: approve / reject KYC
  async reviewKyc(req: Request, res: Response) {
    const { kycId } = req.params;
    const { action } = req.body;

    const result = await kycService.adminReviewKyc(
      kycId,
      action === "APPROVE" ? "APPROVE" : "REJECT"
    );

    sendResponse(res, 200, true, `KYC ${action.toLowerCase()}d`, result);
  }
}
