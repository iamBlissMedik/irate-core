import { z } from "zod";

// amount is in MINOR UNITS (kobo) — must be a positive whole number.
// Send money to a recipient by their 10-digit account number.
export const transferSchema = z.object({
  toAccountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Account number must be 10 digits"),
  amount: z.coerce
    .number()
    .int("Amount must be an integer number of minor units (kobo)")
    .positive("Amount must be greater than 0"),
});
