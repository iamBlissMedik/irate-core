import { prisma } from "@core/config/prisma";
import { AppError } from "@core/errors/AppError";

export class KycService {
  /**
   * User submits KYC information
   */
  async submitKyc(
    userId: string,
    data: {
      fullName: string;
      dateOfBirth: Date;
      address: string;
      idType: string;
      idNumber: string;
      documentUrl?: string;
    }
  ) {
    const existing = await prisma.kYC.findUnique({ where: { userId } });

    if (existing) {
      switch (existing.status) {
        case "PENDING":
          throw new AppError(
            "KYC is already submitted and pending review",
            400
          );

        case "REJECTED":
          // Allow resubmission
          return prisma.kYC.update({
            where: { userId },
            data: {
              fullName: data.fullName,
              dateOfBirth: data.dateOfBirth,
              address: data.address,
              idType: data.idType,
              idNumber: data.idNumber,
              documentUrl: data.documentUrl,
              status: "PENDING", // reset status to pending
            },
          });

        case "VERIFIED":
          throw new AppError(
            "KYC is already approved and cannot be modified",
            400
          );
      }
    }

    // No existing record, create new
    return prisma.kYC.create({
      data: {
        userId,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        idType: data.idType,
        idNumber: data.idNumber,
        documentUrl: data.documentUrl,
        status: "PENDING",
      },
    });
  }

  /**
   * User views their KYC record
   */
  async getMyKyc(userId: string) {
    const kyc = await prisma.kYC.findUnique({ where: { userId } });
    if (!kyc) throw new AppError("No KYC record found", 404);
    return kyc;
  }

  /**
   * Admin reviews (approve or reject) a KYC submission
   */
  async adminReviewKyc(kycId: string, action: "APPROVE" | "REJECT") {
    const kyc = await prisma.kYC.findUnique({ where: { id: kycId } });
    if (!kyc) throw new AppError("KYC record not found", 404);

    const status = action === "APPROVE" ? "VERIFIED" : "REJECTED";

    const updated = await prisma.kYC.update({
      where: { id: kycId },
      data: {
        status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
      },
    });

    // ✅ Optionally mark user as verified
    if (status === "VERIFIED") {
      await prisma.user.update({
        where: { id: kyc.userId },
        data: {
          role: "USER", // optional, if role changes after verification
        },
      });
    }

    return updated;
  }

  /**
   * Admin lists all KYC submissions (filterable)
   */
  async listKycs(
    status?: "PENDING" | "VERIFIED" | "REJECTED",
    page = 1,
    limit = 10
  ) {
    const skip = (page - 1) * limit;

    const [kycs, total] = await Promise.all([
      prisma.kYC.findMany({
        where: status ? { status } : {},
        include: {
          user: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.kYC.count({
        where: status ? { status } : {},
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      kycs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
