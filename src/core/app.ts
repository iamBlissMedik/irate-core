/// <reference path="../types/express/index.d.ts" />

import "tsconfig-paths/register";
import express from "express";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { globalErrorHandler } from "./errors/errorHandler";
import { authRouter } from "@modules/auth/auth.routes";
import { redis } from "./config/redis";
import { corsMiddleware } from "./config/cors";
import cookieParser from "cookie-parser";

export const createApp = async () => {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
    app.use(cookieParser());

  const limiter = rateLimit({
    store: new RedisStore({
      // ✅ Works with ioredis and is fully type-safe
      sendCommand: async (...args: [string, ...string[]]) =>
        redis.call(...args) as unknown as Promise<any>,
    }),
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  });
  app.use(limiter);

  app.get("/", async (req, res) => {
    res.send("welcome to the core");
  });
  app.use("/api/auth", authRouter);

  app.use(globalErrorHandler);

  return app;
};
