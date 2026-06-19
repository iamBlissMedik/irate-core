import { transferSchema } from "@modules/transaction/transaction.schema";
import { creditSchema } from "@modules/admin/admin.schema";
import { registerSchema, loginSchema } from "@modules/auth/auth.schema";

describe("validation schemas", () => {
  describe("transferSchema", () => {
    it("accepts a valid transfer payload (account number + minor units)", () => {
      const parsed = transferSchema.parse({
        toAccountNumber: "1000000002",
        amount: 5000,
      });
      expect(parsed.amount).toBe(5000);
      expect(parsed.toAccountNumber).toBe("1000000002");
    });

    it("rejects a malformed account number", () => {
      expect(() =>
        transferSchema.parse({ toAccountNumber: "123", amount: 5000 })
      ).toThrow();
    });

    it("rejects non-integer amounts", () => {
      expect(() =>
        transferSchema.parse({ toAccountNumber: "1000000002", amount: 50.5 })
      ).toThrow();
    });

    it("rejects non-positive amounts", () => {
      expect(() =>
        transferSchema.parse({ toAccountNumber: "1000000002", amount: 0 })
      ).toThrow();
    });
  });

  describe("creditSchema", () => {
    it("requires a reason", () => {
      expect(() => creditSchema.parse({ amount: 1000, reason: "" })).toThrow();
    });

    it("accepts a valid credit payload", () => {
      expect(creditSchema.parse({ amount: 1000, reason: "Top up" })).toEqual({
        amount: 1000,
        reason: "Top up",
      });
    });
  });

  describe("auth schemas", () => {
    it("registerSchema enforces email + min password length", () => {
      expect(() =>
        registerSchema.parse({ email: "not-an-email", password: "123456" })
      ).toThrow();
      expect(() =>
        registerSchema.parse({ email: "a@b.com", password: "123" })
      ).toThrow();
      expect(
        registerSchema.parse({ email: "a@b.com", password: "123456" })
      ).toEqual({ email: "a@b.com", password: "123456" });
    });

    it("loginSchema requires a valid email", () => {
      expect(() =>
        loginSchema.parse({ email: "bad", password: "x" })
      ).toThrow();
    });
  });
});
