import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CredentialManager } from './credential-manager.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import type { CredentialPayload } from '@sasa/shared';

describe('CredentialManager', () => {
  let manager: CredentialManager;
  let cryptoService: CryptoService;
  let strategyResolver: AuthStrategyResolver;
  let connectorRegistry: ConnectorRegistry;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CredentialManager,
        {
          provide: 'DATABASE',
          useValue: mockDb,
        },
        {
          provide: CryptoService,
          useValue: {
            decrypt: jest.fn(),
            encrypt: jest.fn(),
          },
        },
        {
          provide: AuthStrategyResolver,
          useValue: {
            resolve: jest.fn(),
          },
        },
        {
          provide: ConnectorRegistry,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    manager = module.get(CredentialManager);
    cryptoService = module.get(CryptoService);
    strategyResolver = module.get(AuthStrategyResolver);
    connectorRegistry = module.get(ConnectorRegistry);
  });

  describe('getValidAuthHeaders', () => {
    it('should return auth headers for valid api_key binding', async () => {
      const payload: CredentialPayload = { type: 'api_key', apiKey: 'sk-test-123' };
      const binding = {
        authType: 'api_key',
        encryptedCred: Buffer.from('encrypted'),
        status: 'active',
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([binding]),
        }),
      });

      (cryptoService.decrypt as jest.Mock).mockReturnValue(JSON.stringify(payload));
      (strategyResolver.resolve as jest.Mock).mockReturnValue({
        type: 'api_key',
        buildAuthHeaders: jest.fn().mockReturnValue({ Authorization: 'Bearer sk-test-123' }),
      });
      (connectorRegistry.get as jest.Mock).mockReturnValue({
        getAuthStrategyConfig: jest.fn().mockReturnValue({ type: 'api_key', params: {} }),
      });

      const headers = await manager.getValidAuthHeaders('user-1', 'connector-1');
      expect(headers).toEqual({ Authorization: 'Bearer sk-test-123' });
    });

    it('should throw NotFoundException when no binding exists', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      await expect(manager.getValidAuthHeaders('user-1', 'connector-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when binding is expired', async () => {
      const binding = {
        authType: 'api_key',
        encryptedCred: Buffer.from('encrypted'),
        status: 'expired',
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([binding]),
        }),
      });

      await expect(manager.getValidAuthHeaders('user-1', 'connector-1')).rejects.toThrow(ForbiddenException);
    });

    it('should auto-refresh expired app_secret binding', async () => {
      const expiredPayload: CredentialPayload = {
        type: 'app_secret',
        appId: 'app-1',
        appSecret: 'secret-1',
        accessToken: 'at-old',
        expiresAt: Date.now() - 1000,
      };
      const refreshedPayload: CredentialPayload = {
        type: 'app_secret',
        appId: 'app-1',
        appSecret: 'secret-1',
        accessToken: 'at-new',
        expiresAt: Date.now() + 7200000,
      };

      // First call returns expired binding
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'app_secret',
            encryptedCred: Buffer.from('encrypted'),
            status: 'active',
          }]),
        }),
      });

      (cryptoService.decrypt as jest.Mock)
        .mockReturnValueOnce(JSON.stringify(expiredPayload))
        .mockReturnValueOnce(JSON.stringify(expiredPayload)); // re-read after lock

      const mockStrategy = {
        type: 'app_secret',
        buildAuthHeaders: jest.fn().mockReturnValue({ Authorization: 'Bearer at-new' }),
        isExpired: jest.fn().mockReturnValue(true).mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValueOnce(false),
        refreshToken: jest.fn().mockResolvedValue(refreshedPayload),
      };

      (strategyResolver.resolve as jest.Mock).mockReturnValue(mockStrategy);
      (connectorRegistry.get as jest.Mock).mockReturnValue({
        getAuthStrategyConfig: jest.fn().mockReturnValue({
          type: 'app_secret',
          params: { tokenUrl: 'https://api.example.com/token' },
        }),
      });

      // Mock update
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });
      (cryptoService.encrypt as jest.Mock).mockReturnValue(Buffer.from('new-encrypted'));

      const headers = await manager.getValidAuthHeaders('user-1', 'connector-1');
      expect(headers).toEqual({ Authorization: 'Bearer at-new' });
      expect(mockStrategy.refreshToken).toHaveBeenCalled();
    });
  });
});
