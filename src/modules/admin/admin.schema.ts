import { z } from "zod";

// amount is in MINOR UNITS (kobo) — must be a positive whole number.
export const creditSchema = z.object({
  amount: z.coerce
    .number()
    .int("Amount must be an integer number of minor units (kobo)")
    .positive("Amount must be greater than 0"),
  reason: z.string("Must be a string").trim().min(1, "Reason cannot be empty"),
});
