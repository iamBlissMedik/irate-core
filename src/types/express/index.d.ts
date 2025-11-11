import { JwtPayload } from "jsonwebtoken";
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user: { id: string; email: string; role: "ADMIN" | "USER" } & JwtPayload;
  }
}

export {}; // mark as a module
