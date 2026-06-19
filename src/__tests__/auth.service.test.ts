import { AuthService } from "@modules/auth/auth.service";
import { prisma } from "@core/config/prisma";
import { redis } from "@core/config/redis";
import bcrypt from "bcrypt";

// Mock all external collaborators so we test pure service logic.
jest.mock("@core/config/prisma", () => ({
  prisma: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));
jest.mock("@core/config/redis", () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock("bcrypt", () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock("jsonwebtoken", () => ({ sign: jest.fn(() => "signed.jwt.token") }));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; create: jest.Mock };
};
const mockedRedis = redis as unknown as Record<string, jest.Mock>;
const mockedBcrypt = bcrypt as unknown as {
  hash: jest.Mock;
  compare: jest.Mock;
};

describe("AuthService", () => {
  const service = new AuthService();

  describe("register", () => {
    it("rejects a duplicate email", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({ id: "1" });
      await expect(
        service.register("dupe@irate.dev", "secret123")
      ).rejects.toThrow("User already exists");
    });

    it("hashes the password and creates the user with a wallet", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed");
      mockedPrisma.user.create.mockResolvedValue({
        id: "u1",
        email: "new@irate.dev",
        wallets: [{ accountNumber: "1234567890" }],
      });

      const result = await service.register("new@irate.dev", "secret123");

      expect(mockedBcrypt.hash).toHaveBeenCalledWith("secret123", 10);
      // A wallet (with an account number) is created alongside the user.
      const createArg = mockedPrisma.user.create.mock.calls[0][0];
      expect(createArg.data.email).toBe("new@irate.dev");
      expect(createArg.data.wallets.create.accountNumber).toMatch(/^\d{10}$/);
      expect(result).toEqual({
        id: "u1",
        email: "new@irate.dev",
        accountNumber: "1234567890",
      });
    });
  });

  describe("login", () => {
    it("throws when the email is unknown", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login("ghost@irate.dev", "secret123")
      ).rejects.toThrow("Email not found");
    });

    it("throws on an invalid password", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@irate.dev",
        password: "hashed",
        role: "USER",
      });
      mockedRedis.incr.mockResolvedValue(1);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(service.login("a@irate.dev", "wrong")).rejects.toThrow(
        "Invalid password"
      );
    });

    it("returns tokens on success", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@irate.dev",
        password: "hashed",
        role: "USER",
      });
      mockedRedis.incr.mockResolvedValue(1);
      mockedBcrypt.compare.mockResolvedValue(true);

      const result = await service.login("a@irate.dev", "correct");

      expect(result.accessToken).toBe("signed.jwt.token");
      expect(result.refreshToken).toBe("signed.jwt.token");
      expect(result.user).toEqual({
        id: "u1",
        email: "a@irate.dev",
        role: "USER",
      });
      expect(mockedRedis.del).toHaveBeenCalledWith("login:fail:a@irate.dev");
    });

    it("blocks after too many failed attempts", async () => {
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@irate.dev",
        password: "hashed",
        role: "USER",
      });
      mockedRedis.incr.mockResolvedValue(6); // over the limit of 5

      await expect(service.login("a@irate.dev", "x")).rejects.toThrow(
        "Too many failed attempts"
      );
    });
  });
});
