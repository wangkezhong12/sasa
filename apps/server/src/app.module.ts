import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({ imports: [DatabaseModule, RedisModule, AuthModule] })
export class AppModule {}
