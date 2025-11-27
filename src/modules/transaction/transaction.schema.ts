import { z } from "zod";

export const transferSchema = z.object({
  fromWalletId: z.cuid("Invalid fromWalletId"),
  toWalletId: z.cuid("Invalid toWalletId"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});
