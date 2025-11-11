import { prisma } from "@core/config/prisma";
import { UserWhereInput } from "generated/client/models";

export class UserService {
  /**
   * ✅ Get all users with pagination and optional search by email.
   */
  async getAllUsers(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    // Build query filters dynamically
    const where: UserWhereInput = search
      ? {
          OR: [
            {
              email: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              kyc: {
                fullName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          kyc: {
            select: {
              id: true,
              status: true,
              verifiedAt: true,
            },
          },
          wallets: {
            select: { id: true, balance: true, createdAt: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users,
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

  /**
   * ✅ Get single user by ID with KYC + wallet info
   */
  async getUserById(
    userId: string,
    walletPage = 1,
    walletLimit = 10,
    txPage = 1,
    txLimit = 5
  ) {
    const skipWallets = (walletPage - 1) * walletLimit;
    const skipTx = (txPage - 1) * txLimit;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        kyc: true,
        wallets: {
          skip: skipWallets,
          take: walletLimit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            balance: true,
            createdAt: true,
            Transaction: {
              skip: skipTx,
              take: txLimit,
              orderBy: { createdAt: "desc" },
              select: { id: true, type: true, amount: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}
