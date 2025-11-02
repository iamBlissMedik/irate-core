import { createClient } from "redis";
import { config } from "./env";

export const redis = createClient({ url: config.REDIS_URL });

redis.on("error", (err) => console.error("Redis Error:", err));

(async () => {
  await redis.connect();
})();
