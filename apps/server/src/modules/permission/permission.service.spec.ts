import { Test } from '@nestjs/testing';
import { PermissionService } from './permission.service';
import { DB } from '../../common/database/database.module';
import { REDIS } from '../../common/redis/redis.module';
import { ConnectorRegistry } from '../connector/connector-registry.service';
import { CredentialManager } from '../auth/credential-manager.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let mockDb: any;
  let mockRedis: any;
  let mockRegistry: any;
  let mockCredentialManager: any;

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
    mockCredentialManager = {
      getValidAuthHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer test-key' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: DB, useValue: mockDb },
        { provide: REDIS, useValue: mockRedis },
        { provide: ConnectorRegistry, useValue: mockRegistry },
        { provide: CredentialManager, useValue: mockCredentialManager },
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

    it('should exclude tools with null requiredPermission', () => {
      const toolsWithNull = [
        { name: 'x', requiredPermission: 'read:data' },
        { name: 'y', requiredPermission: null as unknown as string },
      ];
      const filtered = service.filterTools(toolsWithNull, ['read:data']);
      expect(filtered.map(t => t.name)).toEqual(['x']);
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

    it('should return empty when no permissions endpoint configured', async () => {
      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 'binding-id' }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ authType: 'api_key' }]),
          }),
        });

      mockRegistry.get = jest.fn().mockReturnValue({
        getBaseUrl: () => 'https://api.example.com',
        getAuthStrategyConfig: () => ({ type: 'api_key', params: {} }),
      });

      const result = await service.syncPermissions('user-1', 'conn-1');
      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException when CredentialManager fails', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 'binding-id' }]),
        }),
      });
      mockCredentialManager.getValidAuthHeaders = jest.fn().mockRejectedValue(new Error('Binding not found'));

      // Need to provide authType select for the sync flow
      mockDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ id: 'binding-id' }]),
          }),
        });

      await expect(service.syncPermissions('user-1', 'conn-1'))
        .rejects.toThrow('Failed to sync permissions');
    });
  });
});
