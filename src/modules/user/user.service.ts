import { prisma } from "@core/config/prisma";
import dayjs from "dayjs";
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

  // Total Users + 24h Trend
  async getAllUsersStats() {
    const now = new Date();

    // Today
    const todayStart = dayjs(now).startOf("day").toDate();
    const todayEnd = dayjs(now).endOf("day").toDate();

    // Yesterday
    const yesterdayStart = dayjs(now)
      .subtract(1, "day")
      .startOf("day")
      .toDate();
    const yesterdayEnd = dayjs(now).subtract(1, "day").endOf("day").toDate();

    // Filter: exclude admins (use enum value)
    const userFilter = { role: { not: "ADMIN" as const } };

    // Total number of non-admin users
    const totalUsers = await prisma.user.count({
      where: userFilter,
    });

    // Users created today
    const todayUsers = await prisma.user.count({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    // Users created yesterday
    const yesterdayUsers = await prisma.user.count({
      where: {
        createdAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
    });

    // Trend calculation (percentage growth)
    const trend =
      yesterdayUsers === 0
        ? todayUsers
        : ((todayUsers - yesterdayUsers) / yesterdayUsers) * 100;

    const trendType = trend > 0 ? "up" : trend < 0 ? "down" : "neutral";

    return {
      title: "Total Users",
      value: totalUsers,
      trend: Number(trend.toFixed(1)),
      trendType,
    };
  }
}
