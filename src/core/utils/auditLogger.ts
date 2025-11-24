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

  // 1. File & CloudWatch via Winston
  logger.info(entry);

  // 2. Database
  try {
    await prisma.auditLog.create({
      data: { userId, action, metadata },
    });
  } catch (err) {
    logger.error(`Failed to save audit log to DB: ${(err as Error).message}`);
  }
};
