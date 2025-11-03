import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../../core/errors/AppError";
import { prisma } from "../../core/config/prisma";
import { ValidationError } from "../../core/errors/ValidationError";
import { AuthError } from "../../core/errors/AuthError";
import { config } from "../../core/config/env";

export class AuthController {
  register = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password)
      throw new AppError("Email and password are required", 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("User already exists", 400);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed },
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { id: user.id, email: user.email },
    });
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password)
      throw new ValidationError("Email and password required");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AuthError("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AuthError("Invalid credentials");

    if (!config.JWT_SECRET)
      throw new AppError("JWT secret not configured", 500);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
    });
  };
}
