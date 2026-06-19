import { randomInt } from "crypto";

/**
 * Generate a random 10-digit account number (NUBAN-style, like Nigerian banks).
 * Uniqueness is enforced by the DB unique constraint; callers should retry on
 * collision (see WalletService.createWallet).
 */
export const generateAccountNumber = (): string => {
  // First digit 1-9 so it's always exactly 10 digits, then 9 more digits.
  let n = String(randomInt(1, 10));
  for (let i = 0; i < 9; i++) n += String(randomInt(0, 10));
  return n;
};

/**
 * Derive a display name for "name enquiry" without leaking the full email.
 * Prefers the verified KYC full name; otherwise falls back to the email's
 * local part (e.g. "ada@irate.dev" -> "Ada").
 */
export const deriveAccountName = (
  email: string,
  fullName?: string | null
): string => {
  if (fullName && fullName.trim()) return fullName.trim();
  const local = email.split("@")[0] ?? "User";
  return local.charAt(0).toUpperCase() + local.slice(1);
};
