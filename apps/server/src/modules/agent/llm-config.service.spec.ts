import { Test } from '@nestjs/testing';
import { LLMConfigService } from './llm-config.service';
import { DB } from '../../common/database/database.module';
import { CryptoService } from '../../common/crypto/crypto.service';
import { BadRequestException } from '@nestjs/common';

describe('LLMConfigService', () => {
  let service: LLMConfigService;
  let mockDb: any;
  let mockCrypto: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    mockCrypto = { decrypt: jest.fn().mockReturnValue('decrypted-key') };

    const module = await Test.createTestingModule({
      providers: [
        LLMConfigService,
        { provide: DB, useValue: mockDb },
        { provide: CryptoService, useValue: mockCrypto },
      ],
    }).compile();

    service = module.get(LLMConfigService);
  });

  describe('resolve', () => {
    it('should resolve user config over workspace config', async () => {
      const userConfig = { providerId: 'openai', modelId: 'gpt-4o', apiKeyEncrypted: Buffer.from('enc-user'), baseUrl: null };
      const wsConfig = { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', apiKeyEncrypted: Buffer.from('enc-ws'), baseUrl: null };

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([userConfig]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([wsConfig]),
          }),
        });

      const config = await service.resolve('user-1', 'ws-1');
      expect(config.providerId).toBe('openai');
      expect(config.modelId).toBe('gpt-4o');
    });

    it('should fall back to workspace config when user has no config', async () => {
      const wsConfig = { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', apiKeyEncrypted: Buffer.from('enc-ws'), baseUrl: 'https://custom.api' };

      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([wsConfig]),
          }),
        });

      const config = await service.resolve('user-1', 'ws-1');
      expect(config.providerId).toBe('anthropic');
      expect(config.baseUrl).toBe('https://custom.api');
    });

    it('should decrypt API key before returning', async () => {
      const encrypted = Buffer.from('encrypted-key');
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            providerId: 'openai', modelId: 'gpt-4o', apiKeyEncrypted: encrypted, baseUrl: null,
          }]),
        }),
      });

      const config = await service.resolve('user-1');
      expect(mockCrypto.decrypt).toHaveBeenCalledWith(encrypted);
      expect(config.apiKey).toBe('decrypted-key');
    });

    it('should throw BadRequestException when no config found', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.resolve('user-1')).rejects.toThrow(BadRequestException);
      await expect(service.resolve('user-1')).rejects.toThrow('LLM not configured');
    });

    it('should throw even when workspaceId provided but no configs exist', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(service.resolve('user-1', 'ws-1')).rejects.toThrow(BadRequestException);
    });
  });
});
