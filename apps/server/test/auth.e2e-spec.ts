import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp } from './helpers/test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'New User' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('new@example.com');
          expect(res.body.name).toBe('New User');
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });

    it('should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'Dup User' })
        .expect(409);
    });

    it('should reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'incomplete@example.com' })
        .expect(400);
    });

    it('should reject short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@example.com', password: '12', name: 'Short' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with correct credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'new@example.com', password: 'password123' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe('new@example.com');
        });
    });

    it('should reject wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'new@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);
    });
  });
});
