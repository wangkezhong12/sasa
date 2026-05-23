import { Test } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { DB } from '../../common/database/database.module';

describe('ConversationService', () => {
  let service: ConversationService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(ConversationService);
  });

  describe('create', () => {
    it('should create a conversation with userId', async () => {
      const conv = { id: 'c1', userId: 'u1', connectorId: null, workspaceId: null, title: null };
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([conv]),
        }),
      });

      const result = await service.create('u1');
      expect(result).toEqual(conv);
    });

    it('should create a conversation with optional connectorId and workspaceId', async () => {
      const conv = { id: 'c2', userId: 'u1', connectorId: 'conn-1', workspaceId: 'ws-1', title: null };
      mockDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([conv]),
        }),
      });

      const result = await service.create('u1', 'conn-1', 'ws-1');
      expect(result).toEqual(conv);
    });
  });

  describe('findByUser', () => {
    it('should return conversations ordered by updatedAt desc', async () => {
      const convs = [{ id: 'c1' }, { id: 'c2' }];
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(convs),
          }),
        }),
      });

      const result = await service.findByUser('u1');
      expect(result).toEqual(convs);
    });
  });

  describe('findById', () => {
    it('should return conversation when found', async () => {
      const conv = { id: 'c1', userId: 'u1' };
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([conv]),
        }),
      });

      const result = await service.findById('c1');
      expect(result).toEqual(conv);
    });

    it('should return null when not found', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateTitle', () => {
    it('should update title and return updated conversation', async () => {
      const updated = { id: 'c1', title: 'New Title' };
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updated]),
          }),
        }),
      });

      const result = await service.updateTitle('c1', 'New Title');
      expect(result).toEqual(updated);
    });

    it('should return null when conversation not found', async () => {
      mockDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.updateTitle('nonexistent', 'Title');
      expect(result).toBeNull();
    });
  });
});
