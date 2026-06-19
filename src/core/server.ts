import { createApp } from "./app";
import { config } from "./config/env";
import logger from "./utils/logger";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";

(async () => {
  const app = await createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Server running on port ${config.PORT}`);
  });

  // Graceful shutdown — drain connections, then close DB/Redis.
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
