import { redis } from "../core/config/redis";

async function testRedis() {
  await redis.set("hello", "world");
  const value = await redis.get("hello");
  console.log("Redis says:", value);

  await redis.del("hello");
  await redis.quit();
}

testRedis().catch(console.error);
