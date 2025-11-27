import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import logger from "@core/utils/logger";

export const globalErrorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("🔥 Error caught:", err);

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : "Internal server error. Please try again.";
  logger.error(`${err.message} - ${_req.method} ${_req.originalUrl}`);
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};
