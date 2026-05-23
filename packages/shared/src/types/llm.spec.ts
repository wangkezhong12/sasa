import { describe, it, expect } from 'vitest';
import type { LLMConfig, LLMProvider } from './llm';
import { LLM_PROVIDERS } from './llm';

describe('llm types', () => {
  it('LLMConfig should hold provider configuration', () => {
    const config: LLMConfig = {
      id: 'cfg-1',
      scope: 'user',
      scopeId: 'u-1',
      providerId: 'openai',
      modelId: 'gpt-4o',
      baseUrl: null,
      isActive: true,
    };
    expect(config.providerId).toBe('openai');
    expect(config.isActive).toBe(true);
  });

  it('LLM_PROVIDERS should contain 4 providers', () => {
    expect(LLM_PROVIDERS).toHaveLength(4);
    const ids = LLM_PROVIDERS.map((p) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('deepseek');
    expect(ids).toContain('custom');
  });

  it('OpenAI provider should have default base URL', () => {
    const openai = LLM_PROVIDERS.find((p) => p.id === 'openai')!;
    expect(openai.defaultBaseUrl).toBe('https://api.openai.com/v1');
    expect(openai.models.length).toBeGreaterThan(0);
  });
});
