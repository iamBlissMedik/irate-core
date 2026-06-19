import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Application logger (pino).
 *
 * - In development we pretty-print for readability.
 * - In production we emit newline-delimited JSON, which is what log
 *   aggregators (CloudWatch, Datadog, Loki, ...) expect.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  // Never log secrets / tokens that slip into request bodies or headers.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "password",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});

export default logger;
