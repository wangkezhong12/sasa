import { Module } from '@nestjs/common';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConnectorModule } from './modules/connector/connector.module';
import { SchemaModule } from './modules/schema/schema.module';
import { PermissionModule } from './modules/permission/permission.module';
import { AgentModule } from './modules/agent/agent.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({ imports: [DatabaseModule, RedisModule, AuthModule, ConnectorModule, SchemaModule, PermissionModule, AgentModule, ChatModule] })
export class AppModule {}
