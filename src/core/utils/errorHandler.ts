import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import logger from "@core/utils/logger";

export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  // Map known error shapes to a status code + safe client message.
  let statusCode = 500;
  let message = "Internal server error. Please try again.";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = err.issues
      .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
      .join(", ");
  }

  // Log full detail server-side; only 5xx are unexpected.
  const logPayload = { err, method: req.method, url: req.originalUrl };
  if (statusCode >= 500) {
    logger.error(logPayload, message);
  } else {
    logger.warn(logPayload, message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
