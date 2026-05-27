import { Test } from '@nestjs/testing';
import { SaaSBindingService } from './saas-binding.service';
import { DB } from '../../common/database/database.module';
import { CryptoService } from '../../common/crypto/crypto.service';
import { AuthStrategyResolver } from './auth-strategy.resolver';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { ApiKeyStrategy } from '@sasa/connector-sdk';

describe('SaaSBindingService', () => {
  let service: SaaSBindingService;
  let mockDb: any;
  let cryptoService: CryptoService;

  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'binding-1', userId: 'user-1', connectorId: 'conn-1',
            authType: 'api_key', status: 'active', createdAt: new Date(),
          }]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'binding-1' }]),
      }),
    };

    const mockStrategyResolver = {
      resolve: jest.fn().mockReturnValue(new ApiKeyStrategy()),
    };
    const mockConnectorRegistry = {
      get: jest.fn().mockReturnValue({
        getAuthStrategyConfig: jest.fn().mockReturnValue({ type: 'api_key', params: {} }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        SaaSBindingService,
        CryptoService,
        { provide: DB, useValue: mockDb },
        { provide: AuthStrategyResolver, useValue: mockStrategyResolver },
        { provide: ConnectorRegistry, useValue: mockConnectorRegistry },
      ],
    }).compile();

    service = module.get(SaaSBindingService);
    cryptoService = module.get(CryptoService);
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  describe('bind', () => {
    it('should use strategy to validate and store JSON payload', async () => {
      await service.bind('user-1', {
        connectorId: 'conn-1', authType: 'api_key', credential: { apiKey: 'sk-test-key' },
      });
      const valuesCall = mockDb.insert().values.mock.calls[0][0];
      expect(valuesCall.encryptedCred).toBeInstanceOf(Buffer);
      // Verify stored JSON payload
      const decrypted = cryptoService.decrypt(valuesCall.encryptedCred);
      const payload = JSON.parse(decrypted);
      expect(payload).toEqual({ type: 'api_key', apiKey: 'sk-test-key' });
    });

    it('should store binding with correct fields', async () => {
      const result = await service.bind('user-1', {
        connectorId: 'conn-1', authType: 'api_key', credential: { apiKey: 'sk-test' },
        saasUserId: 'saas-user-1', saasUsername: 'testuser',
      });
      const valuesCall = mockDb.insert().values.mock.calls[0][0];
      expect(valuesCall.authType).toBe('api_key');
      expect(valuesCall.saasUserId).toBe('saas-user-1');
      expect(valuesCall.connectorId).toBe('conn-1');
    });

    it('should not return encryptedCred in result', async () => {
      const result = await service.bind('user-1', {
        connectorId: 'conn-1', authType: 'api_key', credential: { apiKey: 'sk-test' },
      });
      expect(result.encryptedCred).toBeUndefined();
    });
  });

  describe('bindWithPayload', () => {
    it('should store pre-encrypted payload directly', async () => {
      const encryptedCred = cryptoService.encrypt(JSON.stringify({ type: 'oauth2_code', accessToken: 'at-123' }));
      await service.bindWithPayload('user-1', 'conn-1', 'oauth2_code', encryptedCred);
      const valuesCall = mockDb.insert().values.mock.calls[0][0];
      expect(valuesCall.authType).toBe('oauth2_code');
      expect(valuesCall.encryptedCred).toBeInstanceOf(Buffer);
    });
  });

  describe('getBindings', () => {
    it('should return bindings for user', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            { id: 'b-1', userId: 'user-1', connectorId: 'conn-1', authType: 'api_key' },
          ]),
        }),
      });
      const result = await service.getBindings('user-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('unbind', () => {
    it('should only unbind own bindings', async () => {
      mockDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'binding-1' }]),
      });
      await service.unbind('user-1', 'binding-1');
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
