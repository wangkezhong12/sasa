import { Injectable } from '@nestjs/common';

export interface PromptContext {
  saasName: string;
  userName: string;
  userRole: string;
  currentTime?: string;
  customInstructions?: string;
}

@Injectable()
export class PromptBuilderService {
  buildSystemPrompt(ctx: PromptContext): string {
    const lines: string[] = [
      `你是一个 SaaS 操作助手。当前连接的 SaaS 系统是: ${ctx.saasName}`,
      `用户: ${ctx.userName} (角色: ${ctx.userRole})`,
      `当前时间: ${ctx.currentTime || new Date().toISOString()}`,
      '',
      '操作约束:',
      '- 执行操作前必须确认参数完整性，如用户表述不清晰，主动追问',
      '- 只使用提供的工具，不要编造参数值',
      '- 如遇到错误，用自然语言解释并建议下一步',
    ];

    if (ctx.customInstructions) {
      lines.push('', `SaaS 专属指令:`, ctx.customInstructions);
    }

    return lines.join('\n');
  }
}
