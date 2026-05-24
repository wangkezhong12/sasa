import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { createPublishedConnector } from './helpers/test-data';

describe('SaaS Binding (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let connectorId: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'binding');
    token = user.token;
    connectorId = await createPublishedConnector(app, token);
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let bindingId: string;

  it('should bind a connector', () => {
    return request(app.getHttpServer())
      .post('/saas-bindings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        connectorId,
        authType: 'api_key',
        credential: 'demo-test-api-key-12345',
        saasUsername: 'testuser',
      })
      .expect(201)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.connectorId).toBe(connectorId);
        expect(res.body.authType).toBe('api_key');
        expect(res.body.saasUsername).toBe('testuser');
        expect(res.body).not.toHaveProperty('encryptedCred');
        bindingId = res.body.id;
      });
  });

  it('should list user bindings', () => {
    return request(app.getHttpServer())
      .get('/saas-bindings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        expect(res.body[0].id).toBe(bindingId);
      });
  });

  it('should unbind a connector', () => {
    return request(app.getHttpServer())
      .delete(`/saas-bindings/${bindingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should have empty bindings after unbind', () => {
    return request(app.getHttpServer())
      .get('/saas-bindings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body).toHaveLength(0);
      });
  });

  it('should reject without JWT', () => {
    return request(app.getHttpServer())
      .get('/saas-bindings')
      .expect(401);
  });
});
