import { pinoHttp } from "pino-http";
import logger from "../utils/logger";

/**
 * HTTP request logger backed by the shared pino instance.
 * Logs one structured line per request with method, url, status and latency.
 */
const requestLogger = pinoHttp({
  logger,
  // Quieten health checks so they don't flood the logs.
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/",
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});

export default requestLogger;
