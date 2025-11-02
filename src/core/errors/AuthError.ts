import { AppError } from "./AppError";

export class AuthError extends AppError {
  constructor(message = "Unauthorized access") {
    super(message, 401);
  }
}
