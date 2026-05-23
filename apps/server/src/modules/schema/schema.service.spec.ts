import { Test } from '@nestjs/testing';
import { SchemaService } from './schema.service';
import { SchemaParserService } from './schema-parser.service';
import { DB } from '../../common/database/database.module';

describe('SchemaService', () => {
  let service: SchemaService;
  let mockDb: any;

  beforeEach(async () => {
    const mockReturning = jest.fn().mockResolvedValue([{
      id: 'conn-1', name: 'Test API', status: 'draft', workspaceId: null,
    }]);

    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: mockReturning }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'tool-1', riskLevel: 'write', requiredPermission: 'items:create' }]),
          }),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        SchemaService,
        SchemaParserService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(SchemaService);
  });

  describe('uploadAndParse', () => {
    it('should parse schema and create connector with draft status', async () => {
      const spec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: { '/items': { get: { operationId: 'listItems', summary: 'List', responses: { '200': { description: 'OK' } } } } },
      });

      const result = await service.uploadAndParse(null, 'Test API', spec);
      expect(result.status).toBe('draft');
      expect(result.name).toBe('Test API');
    });

    it('should create tool definitions from parsed schema', async () => {
      const spec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0' },
        paths: {
          '/items': { get: { operationId: 'listItems', summary: 'List', responses: { '200': { description: 'OK' } } } },
          '/orders': { post: { operationId: 'createOrder', summary: 'Create', responses: { '201': { description: 'Created' } } } },
        },
      });

      await service.uploadAndParse(null, 'Test API', spec);
      // insert called once for connector + once per tool
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('publishConnector', () => {
    it('should update connector status to active', async () => {
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'conn-1', status: 'active' }]),
          }),
        }),
      });

      const result = await service.publishConnector('conn-1');
      expect(result.status).toBe('active');
    });
  });

  describe('updateTool', () => {
    it('should update tool riskLevel and requiredPermission', async () => {
      const result = await service.updateTool('tool-1', { riskLevel: 'write', requiredPermission: 'items:create' });
      expect(result.requiredPermission).toBe('items:create');
    });
  });
});
