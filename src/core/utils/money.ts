/**
 * Money handling.
 *
 * All monetary values are stored and transmitted as INTEGER MINOR UNITS
 * (e.g. kobo for NGN, cents for USD). 1 Naira = 100 kobo.
 *
 * Why minor units?
 *  - Floating point (e.g. 0.1 + 0.2 !== 0.3) is unsafe for money.
 *  - Storing integers means every arithmetic operation is exact.
 *
 * In the database these columns are `BigInt` so balances can scale far beyond
 * the ~2.1 billion limit of a 32-bit Int (2.1B kobo is only ~21M NGN).
 *
 * Because JSON has no BigInt type, we serialise BigInt as a decimal *string*
 * (see `registerBigIntSerializer`). Clients should treat money fields as
 * integer strings of minor units and divide by 100 for display.
 */

export const MINOR_UNITS_PER_MAJOR = 100n;

/** Convert a major-unit amount (e.g. 50.25 Naira) to minor units (5025 kobo). */
export const toMinorUnits = (major: number): bigint => {
  if (!Number.isFinite(major)) {
    throw new Error("Amount must be a finite number");
  }
  // Round to avoid float drift (e.g. 50.29 * 100 = 5028.9999).
  return BigInt(Math.round(major * 100));
};

/** Convert minor units (5025 kobo) to a major-unit number (50.25 Naira). */
export const toMajorUnits = (minor: bigint): number =>
  Number(minor) / Number(MINOR_UNITS_PER_MAJOR);

/**
 * Parse an incoming API amount (already in minor units) into a positive BigInt.
 * Throws on non-integer / non-positive input.
 */
export const parseAmount = (value: number | string): bigint => {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error("Amount must be a positive integer in minor units");
  }
  return BigInt(num);
};

/**
 * Teach JSON.stringify (and therefore res.json) to emit BigInt as a string.
 * Call once at process start.
 */
export const registerBigIntSerializer = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
};
