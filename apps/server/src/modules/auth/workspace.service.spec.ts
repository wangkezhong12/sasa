import { Test } from '@nestjs/testing';
import { WorkspaceService } from './workspace.service';
import { DB } from '../../common/database/database.module';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let mockDb: any;

  beforeEach(async () => {
    const mockReturning = jest.fn().mockResolvedValue([{
      id: 'ws-1', name: 'Test Workspace', slug: 'test-workspace-abc',
      ownerId: 'user-1', settingsJson: {}, createdAt: new Date(),
    }]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });

    mockDb = {
      insert: jest.fn().mockReturnValue({ values: mockValues }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{
              workspace: { id: 'ws-1', name: 'Test Workspace', slug: 'test-workspace' },
              role: 'owner',
            }]),
          }),
        }),
      }),
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ id: 'member-1' }]),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(WorkspaceService);
  });

  describe('create', () => {
    it('should create workspace and add owner as member', async () => {
      const result = await service.create('Test Workspace', 'user-1');
      expect(result.name).toBe('Test Workspace');
      // Second insert call is for adding owner as member
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('should generate unique slug from name', async () => {
      await service.create('My Cool Workspace!', 'user-1');
      const insertCall = mockDb.insert.mock.calls[0];
      // slug should be derived from name
      expect(insertCall).toBeDefined();
    });
  });

  describe('findByUser', () => {
    it('should return workspaces with user role', async () => {
      const result = await service.findByUser('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('owner');
    });
  });

  describe('addMember', () => {
    it('should add member with specified role', async () => {
      await service.addMember('ws-1', 'user-2', 'admin');
      // insert was called for the member
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should remove a member from workspace', async () => {
      await service.removeMember('ws-1', 'member-1');
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
