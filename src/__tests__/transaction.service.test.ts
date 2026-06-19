import { TransactionService } from "@modules/transaction/transaction.service";
import { prisma } from "@core/config/prisma";

jest.mock("@core/config/prisma", () => ({
  prisma: {
    wallet: { findMany: jest.fn() },
    transaction: { findMany: jest.fn(), count: jest.fn() },
    ledger: { findMany: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  wallet: { findMany: jest.Mock };
  transaction: { findMany: jest.Mock; count: jest.Mock };
  ledger: { findMany: jest.Mock };
};

describe("TransactionService.getMyTransactions", () => {
  const service = new TransactionService();

  it("queries across all the user's wallets, paginates, and enriches from the ledger", async () => {
    mockedPrisma.wallet.findMany.mockResolvedValue([{ id: "w1" }, { id: "w2" }]);
    mockedPrisma.transaction.findMany.mockResolvedValue([
      { id: "t1", type: "DEBIT", amount: 1500n, walletId: "w1", createdAt: new Date(0) },
    ]);
    mockedPrisma.transaction.count.mockResolvedValue(1);
    mockedPrisma.ledger.findMany.mockResolvedValue([
      {
        referenceId: "t1",
        description: "Transfer to 1000000002",
        balanceAfter: 8500n,
      },
    ]);
    // Counterparty name resolution.
    mockedPrisma.wallet.findMany.mockResolvedValueOnce([{ id: "w1" }, { id: "w2" }]);
    mockedPrisma.wallet.findMany.mockResolvedValueOnce([
      { accountNumber: "1000000002", user: { email: "bola@irate.dev", kyc: null } },
    ]);

    const result = await service.getMyTransactions("u1", 1, 10);

    // Only the caller's wallets are scoped into the query.
    const whereArg = mockedPrisma.transaction.findMany.mock.calls[0][0].where;
    expect(whereArg).toEqual({ walletId: { in: ["w1", "w2"] } });

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      id: "t1",
      direction: "out",
      description: "Transfer to 1000000002",
      counterparty: { accountNumber: "1000000002", name: "Bola" },
      balanceAfter: 8500n,
    });
    expect(result.pagination).toMatchObject({
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
