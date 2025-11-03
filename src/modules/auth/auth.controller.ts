import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AppError } from "@core/errors/AppError";

const authService = new AuthService();

export class AuthController {
  register = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await authService.register(email, password);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.json({
      success: true,
      message: "Login successful",
      ...result,
    });
  };

  refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);

    res.json({
      success: true,
      message: "Access token refreshed",
      ...result,
    });
  };

  logout = async (req: Request, res: Response) => {
    // ✅ Get userId from authenticated request
    const userId = req.user?.id;

    // ✅ Extract access token for blacklisting
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    if (!userId) {
      throw new AppError("No user id");
    }
    const result = await authService.logout(userId, accessToken);

    res.json({
      success: true,
      ...result,
    });
  };
}
