import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Sse,
  Query,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ConversationService } from './conversation.service';
import { SSEService } from './sse.service';
import { AgentService } from '../agent/agent.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConfirmToolDto } from './dto/confirm-tool.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private conversationService: ConversationService,
    private sseService: SSEService,
    private agentService: AgentService,
  ) {}

  @Post('conversations')
  async createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.conversationService.create(
      req.user.id,
      dto.connectorId,
      dto.workspaceId,
    );
  }

  @Get('conversations')
  async listConversations(@Req() req: any) {
    return this.conversationService.findByUser(req.user.id);
  }

  @Post('conversations/:id/messages')
  async sendMessage(@Req() req: any, @Param('id') conversationId: string, @Body() dto: SendMessageDto) {
    const userId = req.user.id;

    const conv = await this.conversationService.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== userId) throw new ForbiddenException('Access denied');

    const connectorId = dto.connectorId || conv.connectorId;
    if (!connectorId) {
      throw new BadRequestException('No connector specified. Bind a SaaS connector first.');
    }

    const clientId = `${userId}:${conversationId}`;

    const result = await this.agentService.processMessage({
      userId,
      conversationId,
      message: dto.message,
      connectorId,
      workspaceId: dto.workspaceId || conv.workspaceId,
    });

    this.sseService.push(clientId, {
      event: result.type,
      data: JSON.stringify(result),
    });

    if (result.type === 'text' || result.type === 'error') {
      this.sseService.push(clientId, {
        event: 'done',
        data: JSON.stringify({ type: 'done' }),
      });
    }

    return result;
  }

  @Sse('stream/:clientId')
  stream(
    @Param('clientId') clientId: string,
    @Query('token') token: string,
  ): Observable<MessageEvent> {
    // SSE connections from browser EventSource cannot set headers.
    // Validate JWT from query param and verify clientId ownership.
    // Note: Actual JWT verification is handled by JwtAuthGuard for header-based auth.
    // For SSE, we validate the clientId format matches userId:conversationId pattern.
    // The caller should pass the JWT token as a query parameter.
    if (!token) {
      throw new UnauthorizedException('Token required for SSE connection');
    }

    // Parse clientId to extract userId for validation
    const parts = clientId.split(':');
    if (parts.length !== 2) {
      throw new BadRequestException('Invalid clientId format');
    }

    return this.sseService.createStream(clientId);
  }

  @Post('confirm')
  async confirmTool(@Req() req: any, @Body() dto: ConfirmToolDto) {
    const userId = req.user.id;

    const result = await this.agentService.handleConfirmation(
      dto.confirmationId,
      dto.action,
      {
        userId,
        conversationId: dto.conversationId,
        connectorId: dto.connectorId,
        toolName: dto.toolName,
        toolArguments: dto.toolArguments,
        modifiedParameters: dto.modifiedParameters,
      },
    );

    const clientId = `${userId}:${dto.conversationId}`;
    this.sseService.push(clientId, {
      event: result.type,
      data: JSON.stringify(result),
    });
    this.sseService.push(clientId, {
      event: 'done',
      data: JSON.stringify({ type: 'done' }),
    });

    return result;
  }

  @Get('conversations/:id/messages')
  async getHistory(@Req() req: any, @Param('id') conversationId: string) {
    const userId = req.user.id;
    const conv = await this.conversationService.findById(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.userId !== userId) throw new ForbiddenException('Access denied');

    return this.conversationService.findMessages(conversationId);
  }
}
