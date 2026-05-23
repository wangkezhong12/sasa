import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';

@Module({ imports: [DatabaseModule, RedisModule] })
export class AppModule {}
