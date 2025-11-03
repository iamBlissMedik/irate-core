import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthError } from "@core/errors/AuthError";
import { config } from "@core/config/env";
import { redis } from "@core/config/redis";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AuthError("Authorization token missing or malformed");
    }

    const token = authHeader.split(" ")[1];
    if (!config.JWT_SECRET) throw new AuthError("JWT secret not configured");

    // 🚫 Check blacklist first (faster fail)
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) throw new AuthError("Token has been revoked");

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      id: string;
      email: string;
    };

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      next(new AuthError("Token expired"));
    } else if (err.name === "JsonWebTokenError") {
      next(new AuthError("Invalid token"));
    } else {
      next(new AuthError("Unauthorized"));
    }
  }
};
