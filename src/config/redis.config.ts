import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB),
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS),
  queuePrefix: process.env.QUEUE_PREFIX,
}));
