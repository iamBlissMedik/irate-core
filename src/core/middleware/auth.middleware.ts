import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthError } from "../../core/errors/AuthError";
import { config } from "../../core/config/env";

// export interface AuthRequest extends Request {
//   user?: { id: string; email: string };
// }

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthError("Authorization token missing or malformed");
    }

    const token = authHeader.split(" ")[1];

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
