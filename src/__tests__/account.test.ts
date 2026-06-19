import { generateAccountNumber, deriveAccountName } from "@core/utils/account";

describe("account util", () => {
  describe("generateAccountNumber", () => {
    it("produces a 10-digit string that never starts with 0", () => {
      for (let i = 0; i < 200; i++) {
        const acct = generateAccountNumber();
        expect(acct).toMatch(/^[1-9]\d{9}$/);
      }
    });
  });

  describe("deriveAccountName", () => {
    it("prefers the KYC full name", () => {
      expect(deriveAccountName("ada@irate.dev", "Ada Lovelace")).toBe(
        "Ada Lovelace"
      );
    });

    it("falls back to a capitalised email local part (no email leak)", () => {
      expect(deriveAccountName("ada@irate.dev")).toBe("Ada");
      expect(deriveAccountName("bola@irate.dev", null)).toBe("Bola");
    });
  });
});
