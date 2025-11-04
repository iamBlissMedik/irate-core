import { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";
import { ValidationError } from "@core/errors/ValidationError";

export const validate =
  (schema: z.ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // Combine all messages into a single comma-separated string
        const message = err.issues
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join(", ");

        return next(new ValidationError(message));
      }
      next(err);
    }
  };
