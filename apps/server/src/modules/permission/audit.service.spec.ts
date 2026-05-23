import { AuditService } from './audit.service';
import { DB } from '../../common/database/database.module';
import { auditLogs } from '../../common/database/schema';

describe('AuditService', () => {
  let service: AuditService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { id: 'log-1', toolName: 'submit_leave', createdAt: new Date() },
              ]),
            }),
          }),
        }),
      }),
    };

    service = new AuditService(mockDb);
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      await service.log({
        userId: 'u1',
        toolName: 'submit_leave',
        saasEndpoint: '/api/leaves',
        requestJson: { type: 'annual' },
        responseStatus: 200,
        responseJson: { id: 'LV001' },
      });
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
    });

    it('should log with minimal required fields', async () => {
      await service.log({
        userId: 'u1',
        toolName: 'query_leave_balance',
        saasEndpoint: '/api/leaves/balance',
      });
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
    });

    it('should log with conversationId', async () => {
      await service.log({
        userId: 'u1',
        conversationId: 'conv-1',
        toolName: 'submit_leave',
        saasEndpoint: '/api/leaves',
      });
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('should find audit logs by user with default limit', async () => {
      const result = await service.findByUser('u1');
      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('submit_leave');
    });

    it('should accept custom limit', async () => {
      await service.findByUser('u1', 10);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
