import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  let service: PromptBuilderService;

  beforeEach(() => {
    service = new PromptBuilderService();
  });

  it('should build system prompt with all context fields', () => {
    const prompt = service.buildSystemPrompt({
      saasName: 'Demo ERP',
      userName: '张三',
      userRole: '普通员工',
      currentTime: '2026-05-23T10:00:00Z',
      customInstructions: '日期格式为 yyyy-MM-dd',
    });

    expect(prompt).toContain('Demo ERP');
    expect(prompt).toContain('张三');
    expect(prompt).toContain('普通员工');
    expect(prompt).toContain('2026-05-23T10:00:00Z');
    expect(prompt).toContain('yyyy-MM-dd');
    expect(prompt).toContain('操作约束');
  });

  it('should use current time when currentTime not provided', () => {
    const prompt = service.buildSystemPrompt({
      saasName: 'ERP',
      userName: 'User',
      userRole: 'admin',
    });
    // Should contain an ISO date
    expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('should omit custom instructions section when not provided', () => {
    const prompt = service.buildSystemPrompt({
      saasName: 'ERP',
      userName: 'User',
      userRole: 'admin',
    });
    expect(prompt).not.toContain('SaaS 专属指令');
  });

  it('should include all operation constraints', () => {
    const prompt = service.buildSystemPrompt({
      saasName: 'ERP',
      userName: 'User',
      userRole: 'admin',
    });
    expect(prompt).toContain('确认参数完整性');
    expect(prompt).toContain('不要编造参数值');
    expect(prompt).toContain('建议下一步');
  });

  it('should handle empty strings gracefully', () => {
    const prompt = service.buildSystemPrompt({
      saasName: '',
      userName: '',
      userRole: '',
    });
    expect(prompt).toContain('SaaS 系统是: ');
    expect(prompt).toContain('用户:  (角色: )');
  });
});
