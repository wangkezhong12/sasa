import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { SAMPLE_OPENAPI_SPEC } from './helpers/test-data';

describe('Schema (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'schema');
    token = user.token;
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let connectorId: string;

  it('should upload an OpenAPI schema', () => {
    return request(app.getHttpServer())
      .post('/schemas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test ERP',
        schema: SAMPLE_OPENAPI_SPEC,
      })
      .expect(201)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test ERP');
        expect(res.body.status).toBe('draft');
        connectorId = res.body.id;
      });
  });

  it('should list connectors', () => {
    return request(app.getHttpServer())
      .get('/schemas/connectors')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        const c = res.body.find((x: any) => x.id === connectorId);
        expect(c).toBeDefined();
        expect(c.status).toBe('draft');
      });
  });

  it('should publish a draft connector', () => {
    return request(app.getHttpServer())
      .post(`/schemas/connectors/${connectorId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((res: any) => {
        expect(res.body.status).toBe('active');
      });
  });

  it('should list tools for a connector', () => {
    return request(app.getHttpServer())
      .get(`/schemas/connectors/${connectorId}/tools`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body.length).toBe(3);
        const names = res.body.map((t: any) => t.name);
        expect(names).toContain('submit_leave');
        expect(names).toContain('query_leave_balance');
        expect(names).toContain('delete_expense');
      });
  });

  it('should update a tool', async () => {
    const toolsRes = await request(app.getHttpServer())
      .get(`/schemas/connectors/${connectorId}/tools`)
      .set('Authorization', `Bearer ${token}`);

    const deleteTool = toolsRes.body.find((t: any) => t.name === 'delete_expense');
    expect(deleteTool).toBeDefined();

    return request(app.getHttpServer())
      .patch(`/schemas/tools/${deleteTool.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ riskLevel: 'delete', requiredPermission: 'expense:delete' })
      .expect(200)
      .expect((res: any) => {
        expect(res.body.riskLevel).toBe('delete');
        expect(res.body.requiredPermission).toBe('expense:delete');
      });
  });

  it('should reject upload without JWT', () => {
    return request(app.getHttpServer())
      .post('/schemas/upload')
      .send({ name: 'X', schema: '{}' })
      .expect(401);
  });

  it('should reject invalid schema', () => {
    return request(app.getHttpServer())
      .post('/schemas/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad', schema: 'not-json' })
      .expect(400);
  });
});
