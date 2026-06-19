import { prisma } from "@core/config/prisma";
import logger from "./logger";

/**
 * Logs an audit entry to file, DB, and CloudWatch
 */
export const auditLog = async (
  action: string,
  userId: string,
  metadata?: object
) => {
  const entry = {
    action,
    userId,
    metadata,
    timestamp: new Date().toISOString(),
  };

  // 1. Structured log line (shipped to your aggregator in production)
  logger.info(entry, "audit");

  // 2. Persist to DB (best-effort — never let auditing break the request)
  try {
    await prisma.auditLog.create({
      data: { userId, action, metadata },
    });
  } catch (err) {
    logger.error(
      { err },
      `Failed to save audit log to DB: ${(err as Error).message}`
    );
  }
};
