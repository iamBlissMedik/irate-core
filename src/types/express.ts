import { JwtPayload } from "jsonwebtoken";
import "express-serve-static-core"; // import the core types to augment

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; email: string } & JwtPayload;
  }
}

// This export ensures TypeScript treats this file as a module
export {};
