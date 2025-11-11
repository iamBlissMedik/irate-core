import { Request, Response, NextFunction } from "express";
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

    res.status(201).json(result);
  }

  // ✅ User: Get own KYC status
  async getMyKyc(req: Request, res: Response) {
    const userId = req.user.id;
    const result = await kycService.getMyKyc(userId);
    res.json(result);
  }

  // ✅ Admin: List all KYC with pagination and filtering
  async listKycs(req: Request, res: Response) {
    const { status, page = "1", limit = "10" } = req.query;

    const result = await kycService.listKycs(
      status as "PENDING" | "VERIFIED" | "REJECTED" | undefined,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);
  }

  // ✅ Admin: Approve / Reject KYC
  async reviewKyc(req: Request, res: Response) {
    const { kycId } = req.params;
    const { action } = req.body;

    const result = await kycService.adminReviewKyc(
      kycId,
      action === "APPROVE" ? "APPROVE" : "REJECT"
    );

    res.json(result);
  }
}
