/// <reference path="../types/express/index.d.ts" />
import "tsconfig-paths/register";
import express from "express";
import "dotenv/config";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./utils/errorHandler";
import { redis } from "./config/redis";
import { corsMiddleware } from "./config/cors";
import requestLogger from "./middleware/requestLogger";
import { notFoundHandler } from "./utils/notFoundHandler";
import { registerBigIntSerializer } from "./utils/money";
import { v1Router } from "routes/v1/v1.routes";

export const createApp = async () => {
  // Money is stored as BigInt — make JSON emit it as a string.
  registerBigIntSerializer();

  const app = express();
  app.set("trust proxy", 1); // correct client IPs behind a proxy (rate limiting)

  // 🔐 Security & parsing middleware first
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(cookieParser());

  // 📝 Log every request (must run BEFORE the routes it describes)
  app.use(requestLogger);

  // ⚡ Rate limiting (Redis-backed so it works across instances)
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

  // 🫀 Health endpoints
  app.get("/", (_req, res) =>
    res.status(200).json({ msg: "Welcome to iRate Core" })
  );
  app.get("/health", (_req, res) =>
    res.status(200).json({ status: "ok", timestamp: new Date() })
  );

  // 🔗 Application modules
  app.use("/api/v1", v1Router);

  // 404 + global error handler (must be last)
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};
