import express from "express";
import { AppError } from "./errors/AppError";
import { globalErrorHandler } from "./errors/errorHandler";
import "dotenv/config";


export const createApp = async () => {
  const app = express();

  app.use(express.json());

  // Register routes

  // Global Error Handler
  app.use(globalErrorHandler);

  return app;
};
