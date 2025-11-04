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
      throw new AuthError("No access token provided");
    }

    const token = authHeader.split(" ")[1];

    if (!config.JWT_SECRET) {
      throw new AuthError("Server misconfiguration: missing JWT secret");
    }

    // 🚫 Check blacklist first
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AuthError("Access token revoked. Please log in again.");
    }

    // ✅ Validate token
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      id: string;
      email: string;
    };

    // ✅ Attach user info
    req.user = decoded;

    return next();
  } catch (err: any) {
    if (err instanceof AuthError) return next(err);

    if (err.name === "TokenExpiredError") {
      return next(new AuthError("ACCESS_TOKEN_EXPIRED"));
    }

    return next(new AuthError("INVALID_ACCESS_TOKEN"));
  }
};
