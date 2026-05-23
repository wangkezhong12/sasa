import { Test } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { DB } from '../../common/database/database.module';
import { REDIS } from '../../common/redis/redis.module';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { CryptoService } from '../../common/crypto/crypto.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let mockDb: any;
  let mockRedis: any;
  let mockRegistry: any;
  let mockCrypto: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
    };
    mockRedis = { get: jest.fn(), set: jest.fn() };
    mockRegistry = { get: jest.fn() };
    mockCrypto = { decrypt: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: DB, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
        { provide: ConnectorRegistry, useValue: mockRegistry },
        { provide: CryptoService, useValue: mockCrypto },
      ],
    }).compile();

    service = module.get(PermissionService);
  });

  describe('filterTools', () => {
    const tools = [
      { name: 'a', requiredPermission: 'leave:submit' },
      { name: 'b', requiredPermission: 'leave:approve' },
      { name: 'c', requiredPermission: 'expense:create' },
      { name: 'd', requiredPermission: '' },
    ];

    it('should filter tools by user permissions', () => {
      const filtered = service.filterTools(tools, ['leave:submit', 'expense:create']);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).toEqual(['a', 'c']);
    });

    it('should exclude tools without requiredPermission', () => {
      const filtered = service.filterTools(tools, ['leave:submit']);
      expect(filtered.map(t => t.name)).not.toContain('d');
    });

    it('should return empty for empty permission list', () => {
      const filtered = service.filterTools(tools.slice(0, 3), []);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('getPermissions', () => {
    it('should return cached permissions from Redis', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(JSON.stringify(['perm1', 'perm2']));
      const result = await service.getPermissions('user-1', 'conn-1');
      expect(result).toEqual(['perm1', 'perm2']);
      expect(mockRedis.get).toHaveBeenCalledWith('permissions:user-1:conn-1');
    });

    it('should fall back to database when Redis has no cache', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(null);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            permissionsJson: ['leave:submit'],
          }]),
        }),
      });
      const result = await service.getPermissions('user-1', 'conn-1');
      expect(result).toEqual(['leave:submit']);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should return empty array when no binding exists', async () => {
      mockRedis.get = jest.fn().mockResolvedValue(null);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      const result = await service.getPermissions('user-1', 'conn-1');
      expect(result).toEqual([]);
    });

    it('should handle Redis failure gracefully', async () => {
      mockRedis.get = jest.fn().mockRejectedValue(new Error('Redis down'));
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            permissionsJson: ['fallback:perm'],
          }]),
        }),
      });
      const result = await service.getPermissions('user-1', 'conn-1');
      expect(result).toEqual(['fallback:perm']);
    });
  });

  describe('syncPermissions', () => {
    it('should return empty when binding not found', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      const result = await service.syncPermissions('user-1', 'conn-1');
      expect(result).toEqual([]);
    });

    it('should fetch permissions from connector, update DB and cache', async () => {
      const fetchedPerms = ['leave:submit', 'leave:approve'];

      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'binding-id',
            encryptedCred: Buffer.from('encrypted'),
          }]),
        }),
      });

      const mockConnector = {
        fetchPermissions: jest.fn().mockResolvedValue(fetchedPerms),
      };
      mockRegistry.get = jest.fn().mockReturnValue(mockConnector);
      mockCrypto.decrypt = jest.fn().mockReturnValue('decrypted-cred');

      const updateChain = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      };
      mockDb.update = jest.fn().mockReturnValue(updateChain);

      const result = await service.syncPermissions('user-1', 'conn-1');

      expect(result).toEqual(fetchedPerms);
      expect(mockRegistry.get).toHaveBeenCalledWith('conn-1');
      expect(mockCrypto.decrypt).toHaveBeenCalledWith(Buffer.from('encrypted'));
      expect(mockConnector.fetchPermissions).toHaveBeenCalledWith('decrypted-cred');
      expect(mockDb.update).toHaveBeenCalledWith(expect.anything());
      expect(updateChain.set).toHaveBeenCalledWith({ permissionsJson: fetchedPerms });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'permissions:user-1:conn-1',
        JSON.stringify(fetchedPerms),
        'EX',
        expect.any(Number),
      );
    });

    it('should throw InternalServerErrorException when connector fails', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'binding-id',
            encryptedCred: Buffer.from('encrypted'),
          }]),
        }),
      });
      mockRegistry.get = jest.fn().mockReturnValue({
        fetchPermissions: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      mockCrypto.decrypt = jest.fn().mockReturnValue('cred');

      await expect(service.syncPermissions('user-1', 'conn-1'))
        .rejects.toThrow('Failed to sync permissions: Network error');
    });

    it('should throw InternalServerErrorException when decrypt fails', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'binding-id',
            encryptedCred: Buffer.from('bad-data'),
          }]),
        }),
      });
      mockRegistry.get = jest.fn().mockReturnValue({});
      mockCrypto.decrypt = jest.fn().mockImplementation(() => { throw new Error('Decryption failed'); });

      await expect(service.syncPermissions('user-1', 'conn-1'))
        .rejects.toThrow('Failed to sync permissions: Decryption failed');
    });
  });
});
