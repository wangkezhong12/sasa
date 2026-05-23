import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DB } from '../../common/database/database.module';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;
  let jwtService: JwtService;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'user-1', email: 'test@test.com', name: 'Test',
            passwordHash: 'hashed', avatarUrl: null,
            createdAt: new Date(), updatedAt: new Date(),
          }]),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue([]),
        }),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('test-jwt-token') },
        },
        { provide: DB, useValue: mockDb },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user and return user without password hash', async () => {
      const result = await service.register('test@test.com', 'password123', 'Test');
      expect(result.email).toBe('test@test.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should reject duplicate email', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 'existing' }]),
        }),
      });
      await expect(service.register('test@test.com', '123456', 'Test'))
        .rejects.toThrow(ConflictException);
    });

    it('should hash password with bcrypt', async () => {
      await service.register('test@test.com', 'password123', 'Test');
      const valuesCall = mockDb.insert().values.mock.calls[0][0];
      expect(valuesCall.passwordHash).not.toBe('password123');
      // bcrypt hash starts with $2b$
      expect(valuesCall.passwordHash).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('login', () => {
    it('should login with correct credentials and return JWT', async () => {
      const hash = await bcrypt.hash('password123', 10);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'user-1', email: 'test@test.com', name: 'Test', passwordHash: hash,
          }]),
        }),
      });
      const result = await service.login('test@test.com', 'password123');
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe('test@test.com');
    });

    it('should reject non-existent user', async () => {
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });
      await expect(service.login('no@test.com', 'pass'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            id: 'u1', email: 'test@test.com', name: 'Test', passwordHash: hash,
          }]),
        }),
      });
      await expect(service.login('test@test.com', 'wrong-password'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
