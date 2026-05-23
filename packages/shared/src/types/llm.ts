export type LLMProvider = 'openai' | 'anthropic' | 'deepseek' | 'custom';

export interface LLMConfig {
  id: string;
  scope: 'workspace' | 'user';
  scopeId: string;
  providerId: LLMProvider;
  modelId: string;
  baseUrl: string | null;
  isActive: boolean;
}

export interface LLMProviderOption {
  id: LLMProvider;
  name: string;
  defaultBaseUrl: string;
  models: { id: string; name: string }[];
}

export const LLM_PROVIDERS: LLMProviderOption[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    defaultBaseUrl: '',
    models: [],
  },
];
