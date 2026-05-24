import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';

describe('Workspace (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'ws');
    token = user.token;
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  let workspaceId: string;

  it('should create a workspace', () => {
    return request(app.getHttpServer())
      .post('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Workspace' })
      .expect(201)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Workspace');
        expect(res.body.slug).toBeDefined();
        expect(res.body.ownerId).toBe(userId);
        workspaceId = res.body.id;
      });
  });

  it('should list user workspaces', () => {
    return request(app.getHttpServer())
      .get('/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].workspace.name).toBe('Test Workspace');
        expect(res.body[0].role).toBe('owner');
      });
  });

  it('should add a member to workspace', async () => {
    const otherUser = await registerUser(app, 'ws-member');

    return request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: otherUser.id, role: 'member' })
      .expect(201)
      .expect((res: any) => {
        expect(res.body.role).toBe('member');
      });
  });

  it('should list workspace members', () => {
    return request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res: any) => {
        expect(res.body.length).toBeGreaterThanOrEqual(2);
      });
  });

  it('should remove a member from workspace', async () => {
    const membersRes = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/members`)
      .set('Authorization', `Bearer ${token}`);

    const member = membersRes.body.find((m: any) => m.role === 'member');
    expect(member).toBeDefined();

    return request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/members/${member.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should reject request without JWT', () => {
    return request(app.getHttpServer())
      .get('/workspaces')
      .expect(401);
  });
});
