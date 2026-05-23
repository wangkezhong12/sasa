import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        redis.on('error', (err) => console.error('Redis error:', err));
        return redis;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
