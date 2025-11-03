import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "@core/config/prisma";
import { redis } from "@core/config/redis";
import { AppError } from "@core/errors/AppError";
import { ValidationError } from "@core/errors/ValidationError";
import { AuthError } from "@core/errors/AuthError";
import { config } from "@core/config/env";

export class AuthService {
  async register(email: string, password: string) {
    if (!email || !password)
      throw new ValidationError("Email and password are required");

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("User already exists", 400);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    return { id: user.id, email: user.email };
  }

  async login(email: string, password: string) {
    if (!email || !password)
      throw new ValidationError("Email and password are required");

    const key = `login:fail:${email}`;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AuthError("Invalid credentials");

    // 🔒 Brute-force protection
    const attempts = await redis.incr(key);
    if (attempts === 1) await redis.expire(key, 300); // 5 minutes
    if (attempts > 5)
      throw new AuthError("Too many failed attempts. Try again later.");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AuthError("Invalid credentials");

    await redis.del(key); // reset failed attempts

    if (!config.JWT_SECRET || !config.JWT_REFRESH_SECRET)
      throw new AppError("JWT secrets not configured", 500);

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 💾 Store refresh token in Redis
    await redis.set(`refresh:${user.id}`, refreshToken, "EX", 7 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new ValidationError("Refresh token required");

    try {
      const decoded = jwt.verify(
        refreshToken,
        config.JWT_REFRESH_SECRET
      ) as any;

      const storedToken = await redis.get(`refresh:${decoded.id}`);
      if (!storedToken || storedToken !== refreshToken)
        throw new AuthError("Invalid or expired refresh token");

      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email },
        config.JWT_SECRET,
        { expiresIn: "15m" }
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new AuthError("Invalid refresh token");
    }
  }

  async logout(userId: string, accessToken?: string) {
    if (!userId) throw new ValidationError("User ID required");

    // ❌ Remove stored refresh token
    await redis.del(`refresh:${userId}`);

    // 🚫 Blacklist access token (optional but recommended)
    if (accessToken) {
      // decode to get remaining expiry
      const decoded = jwt.decode(accessToken) as jwt.JwtPayload | null;
      const exp = decoded?.exp
        ? decoded.exp - Math.floor(Date.now() / 1000)
        : 900; // default 15m
      await redis.set(`blacklist:${accessToken}`, "true", "EX", exp);
    }

    return { message: "Logged out successfully" };
  }
}
