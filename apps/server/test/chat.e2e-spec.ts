import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { createPublishedConnector } from './helpers/test-data';

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let connectorId: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'chat');
    token = user.token;
    userId = user.id;
    connectorId = await createPublishedConnector(app, token);
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let conversationId: string;

  describe('Conversation CRUD', () => {
    it('should create a conversation', () => {
      return request(app.getHttpServer())
        .post('/chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ connectorId })
        .expect(201)
        .expect((res: any) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.userId).toBe(userId);
          expect(res.body.connectorId).toBe(connectorId);
          conversationId = res.body.id;
        });
    });

    it('should list user conversations', () => {
      return request(app.getHttpServer())
        .get('/chat/conversations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.length).toBeGreaterThanOrEqual(1);
          expect(res.body[0].id).toBe(conversationId);
        });
    });

    it('should reject conversation access without JWT', () => {
      return request(app.getHttpServer())
        .get('/chat/conversations')
        .expect(401);
    });
  });

  describe('Message History', () => {
    it('should return empty history for new conversation', () => {
      return request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body).toHaveLength(0);
        });
    });

    it('should reject access to another user conversation', async () => {
      const other = await registerUser(app, 'chat-other');
      return request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(403);
    });

    it('should return 404 for non-existent conversation', () => {
      return request(app.getHttpServer())
        .get('/chat/conversations/00000000-0000-0000-0000-000000000000/messages')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('SSE Stream', () => {
    it('should reject SSE without token', () => {
      return request(app.getHttpServer())
        .get(`/chat/stream/${userId}:${conversationId}`)
        .expect(401);
    });

    it('should reject SSE with invalid clientId format', () => {
      // Auth guard runs first, so without valid JWT we get 401
      return request(app.getHttpServer())
        .get('/chat/stream/invalid?token=whatever')
        .expect(401);
    });
  });
});
