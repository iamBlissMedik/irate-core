import {
  toMinorUnits,
  toMajorUnits,
  parseAmount,
  registerBigIntSerializer,
} from "@core/utils/money";

describe("money util", () => {
  describe("toMinorUnits", () => {
    it("converts major units to minor units", () => {
      expect(toMinorUnits(50)).toBe(5000n);
      expect(toMinorUnits(50.25)).toBe(5025n);
    });

    it("rounds away float drift", () => {
      // 50.29 * 100 = 5028.9999... in IEEE-754
      expect(toMinorUnits(50.29)).toBe(5029n);
    });

    it("rejects non-finite numbers", () => {
      expect(() => toMinorUnits(Infinity)).toThrow();
      expect(() => toMinorUnits(NaN)).toThrow();
    });
  });

  describe("toMajorUnits", () => {
    it("converts minor units back to major units", () => {
      expect(toMajorUnits(5025n)).toBe(50.25);
      expect(toMajorUnits(0n)).toBe(0);
    });
  });

  describe("parseAmount", () => {
    it("accepts positive integer minor units", () => {
      expect(parseAmount(1500)).toBe(1500n);
      expect(parseAmount("2000")).toBe(2000n);
    });

    it("rejects zero, negatives and fractions", () => {
      expect(() => parseAmount(0)).toThrow();
      expect(() => parseAmount(-5)).toThrow();
      expect(() => parseAmount(10.5)).toThrow();
    });
  });

  describe("registerBigIntSerializer", () => {
    it("makes JSON.stringify emit BigInt as a string", () => {
      registerBigIntSerializer();
      expect(JSON.stringify({ balance: 4800000n })).toBe(
        '{"balance":"4800000"}'
      );
    });
  });
});
