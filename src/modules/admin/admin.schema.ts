import { z } from "zod";

export const creditSchema = z.object({
  amount: z
    .number("Must be a number")
    .positive("Amount must be greater than 0"),

  reason: z.string("Must be a string").trim().min(1, "Reason cannot be empty")
});
