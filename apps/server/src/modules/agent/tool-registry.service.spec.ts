import { Test } from '@nestjs/testing';
import { ToolRegistryService, ToolDefRow } from './tool-registry.service';
import { DB } from '../../common/database/database.module';

describe('ToolRegistryService', () => {
  let service: ToolRegistryService;
  let mockDb: any;

  const toolDef1: ToolDefRow = {
    id: 'td-1',
    name: 'submit_leave',
    description: '提交请假申请',
    parametersJson: { type: 'object', properties: { type: { type: 'string' }, start: { type: 'string' }, end: { type: 'string' } } },
    requiredPermission: 'leave:submit',
    riskLevel: 'write',
    apiMappingJson: { method: 'POST', path: '/api/leaves' },
  };

  const toolDef2: ToolDefRow = {
    id: 'td-2',
    name: 'list_orders',
    description: '查询订单列表',
    parametersJson: { type: 'object', properties: { status: { type: 'string' } } },
    requiredPermission: 'order:read',
    riskLevel: 'read',
    apiMappingJson: { method: 'GET', path: '/api/orders' },
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([toolDef1, toolDef2]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        ToolRegistryService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(ToolRegistryService);
  });

  describe('getToolsForConnector', () => {
    it('should load tools from database for a connector', async () => {
      const tools = await service.getToolsForConnector('connector-1');
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('submit_leave');
    });

    it('should return empty array when no tools found', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      const tools = await service.getToolsForConnector('no-tools');
      expect(tools).toEqual([]);
    });
  });

  describe('toAITools', () => {
    it('should convert to AI SDK tool format', () => {
      const aiTools = service.toAITools([toolDef1]);
      expect(aiTools['submit_leave']).toBeDefined();
      expect(aiTools['submit_leave'].description).toBe('提交请假申请');
      expect(aiTools['submit_leave'].parameters).toEqual(toolDef1.parametersJson);
    });

    it('should handle empty tool list', () => {
      const aiTools = service.toAITools([]);
      expect(Object.keys(aiTools)).toHaveLength(0);
    });

    it('should convert multiple tools', () => {
      const aiTools = service.toAITools([toolDef1, toolDef2]);
      expect(Object.keys(aiTools)).toHaveLength(2);
      expect(aiTools['list_orders']).toBeDefined();
    });
  });

  describe('filterByThreshold', () => {
    it('should limit tools by threshold', () => {
      const manyTools: ToolDefRow[] = Array.from({ length: 60 }, (_, i) => ({
        ...toolDef1,
        id: `td-${i}`,
        name: `tool_${i}`,
      }));
      const filtered = service.filterByThreshold(manyTools, 50);
      expect(filtered).toHaveLength(50);
    });

    it('should return all tools when under threshold', () => {
      const filtered = service.filterByThreshold([toolDef1, toolDef2], 50);
      expect(filtered).toHaveLength(2);
    });
  });
});
