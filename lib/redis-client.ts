import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;
let attempted = false;

export function getRedisClient(): Redis | null {
  if (attempted) {
    return redisClient;
  }

  attempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  try {
    redisClient = new Redis({ url, token });
  } catch (error) {
    console.warn('Redis client initialization failed:', error);
    redisClient = null;
  }

  return redisClient;
}
