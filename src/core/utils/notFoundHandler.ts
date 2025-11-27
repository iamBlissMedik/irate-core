import { AppError } from "@core/errors/AppError";
import { Request, Response, NextFunction } from "express";


export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(new AppError(`Route not found - ${req.originalUrl}`, 404));
};
