import { Request, Response, NextFunction } from "express";
import { AppError } from "@core/errors/AppError";

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  console.log(user);
  if (!user) throw new AppError("Unauthorized", 401);

  if (user.role !== "ADMIN") {
    throw new AppError("Forbidden: Admin access only", 403);
  }

  next();
};
