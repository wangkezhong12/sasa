import { Test } from '@nestjs/testing';
import { DB } from '../../common/database/database.module';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CredentialManager } from './credential-manager.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { REDIS } from '../../common/redis/redis.module';
import type { CredentialPayload } from '@sasa/shared';

describe('CredentialManager', () => {
  let manager: CredentialManager;
  let cryptoService: CryptoService;
  let strategyResolver: AuthStrategyResolver;
  let connectorRegistry: ConnectorRegistry;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
    };
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module = await Test.createTestingModule({
      providers: [
        CredentialManager,
        { provide: DB, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
        {
          provide: CryptoService,
          useValue: {
            decrypt: jest.fn(),
            encrypt: jest.fn(),
          },
        },
        {
          provide: AuthStrategyResolver,
          useValue: { resolve: jest.fn() },
        },
        {
          provide: ConnectorRegistry,
          useValue: { get: jest.fn() },
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
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'api_key', encryptedCred: Buffer.from('encrypted'), status: 'active',
          }]),
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
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'api_key', encryptedCred: Buffer.from('encrypted'), status: 'expired',
          }]),
        }),
      });
      await expect(manager.getValidAuthHeaders('user-1', 'connector-1')).rejects.toThrow(ForbiddenException);
    });

    it('should auto-refresh expired app_secret binding with distributed lock', async () => {
      const expiredPayload: CredentialPayload = {
        type: 'app_secret', appId: 'app-1', appSecret: 'secret-1',
        accessToken: 'at-old', expiresAt: Date.now() - 1000,
      };
      const refreshedPayload: CredentialPayload = {
        type: 'app_secret', appId: 'app-1', appSecret: 'secret-1',
        accessToken: 'at-new', expiresAt: Date.now() + 7200000,
      };

      // First select returns expired binding
      const selectChain = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'app_secret', encryptedCred: Buffer.from('encrypted'), status: 'active',
          }]),
        }),
      };
      // Second select (re-read inside lock) returns still-expired
      const reReadChain = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'app_secret', encryptedCred: Buffer.from('encrypted'), status: 'active',
          }]),
        }),
      };
      mockDb.select
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(reReadChain);

      (cryptoService.decrypt as jest.Mock).mockReturnValue(JSON.stringify(expiredPayload));

      const mockStrategy = {
        type: 'app_secret',
        buildAuthHeaders: jest.fn().mockReturnValue({ Authorization: 'Bearer at-new' }),
        isExpired: jest.fn().mockReturnValue(true),
        refreshToken: jest.fn().mockResolvedValue(refreshedPayload),
      };

      (strategyResolver.resolve as jest.Mock).mockReturnValue(mockStrategy);
      (connectorRegistry.get as jest.Mock).mockReturnValue({
        getAuthStrategyConfig: jest.fn().mockReturnValue({
          type: 'app_secret', params: { tokenUrl: 'https://api.example.com/token' },
        }),
      });
      (cryptoService.encrypt as jest.Mock).mockReturnValue(Buffer.from('new-encrypted'));
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const headers = await manager.getValidAuthHeaders('user-1', 'connector-1');
      expect(headers).toEqual({ Authorization: 'Bearer at-new' });
      expect(mockStrategy.refreshToken).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'cred-refresh:user-1:connector-1', '1', 'PX', 10000, 'NX',
      );
      expect(mockRedis.del).toHaveBeenCalledWith('cred-refresh:user-1:connector-1');
    });

    it('should mark binding as expired when refresh fails after retry', async () => {
      const expiredPayload: CredentialPayload = {
        type: 'app_secret', appId: 'app-1', appSecret: 'secret-1',
        accessToken: 'at-old', expiresAt: Date.now() - 1000,
      };

      const selectChain = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'app_secret', encryptedCred: Buffer.from('encrypted'), status: 'active',
          }]),
        }),
      };
      const reReadChain = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            authType: 'app_secret', encryptedCred: Buffer.from('encrypted'), status: 'active',
          }]),
        }),
      };
      mockDb.select
        .mockReturnValueOnce(selectChain)
        .mockReturnValueOnce(reReadChain);

      (cryptoService.decrypt as jest.Mock).mockReturnValue(JSON.stringify(expiredPayload));

      const mockStrategy = {
        type: 'app_secret',
        buildAuthHeaders: jest.fn(),
        isExpired: jest.fn().mockReturnValue(true),
        refreshToken: jest.fn().mockRejectedValue(new Error('Token endpoint down')),
      };

      (strategyResolver.resolve as jest.Mock).mockReturnValue(mockStrategy);
      (connectorRegistry.get as jest.Mock).mockReturnValue({
        getAuthStrategyConfig: jest.fn().mockReturnValue({
          type: 'app_secret', params: { tokenUrl: 'https://api.example.com/token' },
        }),
      });

      const updateChain = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.update.mockReturnValue(updateChain);

      await expect(manager.getValidAuthHeaders('user-1', 'connector-1')).rejects.toThrow(ForbiddenException);
      expect(updateChain.set).toHaveBeenCalledWith({ status: 'expired' });
    });
  });
});
