// src/modules/auth/auth.schema.ts
import { z } from "zod";

// Register schema
export const registerSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});

// Login schema
export const loginSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
  password: z.string(),
});

// // Refresh token schema
// export const refreshSchema = z.object({
//   refreshToken: z.string(),
// });

// --------------------
// Optional: inferred TypeScript types
// --------------------
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
// export type RefreshInput = z.infer<typeof refreshSchema>;
