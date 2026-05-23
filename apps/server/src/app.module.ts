import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConnectorModule } from './modules/connector/connector.module';
import { SchemaModule } from './modules/schema/schema.module';

@Module({ imports: [DatabaseModule, RedisModule, AuthModule, ConnectorModule, SchemaModule] })
export class AppModule {}
