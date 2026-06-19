import { UserService } from "@modules/user/user.service";
import { TransactionService } from "@modules/transaction/transaction.service";
import { prisma } from "@core/config/prisma";

jest.mock("@core/config/prisma", () => ({
  prisma: {
    wallet: { findFirst: jest.fn() },
    kYC: { findUnique: jest.fn() },
    transaction: { aggregate: jest.fn(), count: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  wallet: { findFirst: jest.Mock };
  kYC: { findUnique: jest.Mock };
  transaction: { aggregate: jest.Mock; count: jest.Mock };
};

describe("UserService.getMyOverview", () => {
  const service = new UserService();

  it("assembles account number, balance, KYC status, stats, and recent activity", async () => {
    mockedPrisma.wallet.findFirst.mockResolvedValue({
      id: "w1",
      accountNumber: "1000000001",
      balance: 4800000n,
    });
    mockedPrisma.kYC.findUnique.mockResolvedValue({ status: "VERIFIED" });
    mockedPrisma.transaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 5000000n } }) // credit
      .mockResolvedValueOnce({ _sum: { amount: 200000n } }); // debit
    mockedPrisma.transaction.count.mockResolvedValue(2);

    const recent = [{ id: "t1", direction: "out" }];
    const spy = jest
      .spyOn(TransactionService.prototype, "getMyTransactions")
      .mockResolvedValue({ transactions: recent } as any);

    const overview = await service.getMyOverview("u1");

    expect(overview).toMatchObject({
      accountNumber: "1000000001",
      balance: 4800000n,
      currency: "NGN",
      kycStatus: "VERIFIED",
      stats: { totalIn: 5000000n, totalOut: 200000n, transactionCount: 2 },
      recentTransactions: recent,
    });
    expect(spy).toHaveBeenCalledWith("u1", 1, 5);
  });

  it("throws when the user has no wallet", async () => {
    mockedPrisma.wallet.findFirst.mockResolvedValue(null);
    await expect(service.getMyOverview("nope")).rejects.toThrow("Wallet not found");
  });
});
