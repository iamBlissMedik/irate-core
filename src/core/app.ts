/// <reference path="../types/express/index.d.ts" />
import "tsconfig-paths/register";
import express from "express";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { globalErrorHandler } from "./utils/errorHandler";
import { redis } from "./config/redis";
import { corsMiddleware } from "./config/cors";
import cookieParser from "cookie-parser";
import requestLogger from "./middleware/requestLogger";
import { notFoundHandler } from "./utils/notFoundHandler";
import { v1Router } from "routes/v1/v1.routes";

export const createApp = async () => {
  const app = express();

  // 🔐 Core security middleware first
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(cookieParser());

  // ⚡ Rate limiting middleware
  const limiter = rateLimit({
    store: new RedisStore({
      sendCommand: async (...args: [string, ...string[]]) =>
        redis.call(...args) as unknown as Promise<any>,
    }),
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  });
  app.use(limiter);

  // 🫀 Health endpoint
  app.get("/", (_req, res) =>
    res.status(200).json({ msg: "Welcome to iRate Core" })
  );
  // 🫀 Health endpoint
  app.get("/health", (_req, res) =>
    res.status(200).json({ status: "ok", timestamp: new Date() })
  );

  // 🔗 Application modules
  app.use("/api/v1", v1Router);

  // logging http requests
  app.use(requestLogger);
  // 404 Route Handler
  app.use(notFoundHandler);
  // 🛑 Global Error Handler (must be last)
  app.use(globalErrorHandler);

  return app;
};
