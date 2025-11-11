import { z } from "zod";

export const submitKycSchema = z.object({
  fullName: z.string().trim().min(1, "Full name cannot be empty"),

  dateOfBirth: z
    .string()
    .refine(
      (val) => !isNaN(new Date(val).getTime()),
      "Date of birth must be a valid ISO date"
    )
    .transform((val) => new Date(val)),

  address: z.string().trim().min(1, "Address cannot be empty"),

  idType: z.string().trim().min(1, "ID type cannot be empty"),

  idNumber: z.string().trim().min(1, "ID number cannot be empty"),

  documentUrl: z.string().trim().min(1, "Document URL cannot be empty"),
});

export const reviewKycSchema = z.object({
  action: z.enum(
    ["APPROVE", "REJECT"],
    "Action must be either APPROVE or REJECT"
  ),
});
