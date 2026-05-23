import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ConversationService } from './conversation.service';
import { SSEService } from './sse.service';
import { AgentModule } from '../agent/agent.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AgentModule, AuthModule],
  controllers: [ChatController],
  providers: [ConversationService, SSEService],
  exports: [ConversationService, SSEService],
})
export class ChatModule {}
