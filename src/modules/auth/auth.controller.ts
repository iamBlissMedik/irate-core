import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { getService } from "@infrastructure/di/serviceContainer";

/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints.
 * Uses dependency injection to get AuthService instance.
 *
 * Following Single Responsibility Principle:
 * - Controller: HTTP handling, request/response formatting
 * - Service: Business logic
 * - Repository: Data access
 */
export class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  register = async (req: Request, res: Response) => {
    const authService = getService<AuthService>("AuthService");
    const { email, password } = req.body;
    const user = await authService.register(email, password);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  };

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  login = async (req: Request, res: Response) => {
    const authService = getService<AuthService>("AuthService");
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await authService.login(
      email,
      password,
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

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  refresh = async (req: Request, res: Response) => {
    const authService = getService<AuthService>("AuthService");
    const refreshToken = req.cookies.refreshToken;
    const result = await authService.refresh(refreshToken);

    res.json({
      success: true,
      message: "Access token refreshed",
      ...result,
    });
  };

  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  logout = async (req: Request, res: Response) => {
    const authService = getService<AuthService>("AuthService");
    const userId = req.user?.id;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace("Bearer ", "");

    await authService.logout(userId!, accessToken);

    // ✅ Remove refresh token cookie
    res.clearCookie("refreshToken");

    res.json({ success: true, message: "Logged out successfully" });
  };
}
