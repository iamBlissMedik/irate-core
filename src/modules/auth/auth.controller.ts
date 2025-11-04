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
    const { accessToken, refreshToken, user } = await authService.login(
      email,
      password
    );
    // ✅ Store refresh token in HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ Send access token in JSON (frontend stores in memory, not localStorage)
    res.json({
      success: true,
      message: "Login successful",
      accessToken,
      user,
    });
  };

  refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    const result = await authService.refresh(refreshToken);

    res.json({
      success: true,
      message: "Access token refreshed",
      ...result,
    });
  };

  logout = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace("Bearer ", "");

    await authService.logout(userId!, accessToken);

    // ✅ Remove refresh token cookie
    res.clearCookie("refreshToken");

    res.json({ success: true, message: "Logged out successfully" });
  };
}
