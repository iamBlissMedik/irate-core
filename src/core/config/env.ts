import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Read a required env var. In production a missing value is fatal; in
 * development we fall back to a clearly-marked dev default so the app still
 * boots, but we warn loudly.
 */
const required = (key: string, devFallback?: string): string => {
  const value = process.env[key];
  if (value) return value;

  if (isProduction || devFallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  // eslint-disable-next-line no-console
  console.warn(`⚠️  ${key} not set — using insecure dev default`);
  return devFallback;
};

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  isProduction,
  PORT: Number(process.env.PORT ?? 8000),
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  JWT_SECRET: required("JWT_SECRET", "dev-access-secret"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
};
