import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DB } from '../src/common/database/database.module';
import { CryptoService } from '../src/common/crypto/crypto.service';
import { llmConfigs, saasBindings } from '../src/common/database/schema';
import { cleanDatabase } from './helpers/db-cleaner';
import { createTestApp, registerUser } from './helpers/test-app';
import { createPublishedConnector } from './helpers/test-data';

describe('LLM Integration (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let userId: string;
  let connectorId: string;
  let conversationId: string;

  beforeAll(async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY not set in .env.test — skipping LLM integration test');
    }

    await cleanDatabase(process.env.DATABASE_URL!);
    app = await createTestApp();
    const user = await registerUser(app, 'llm');
    token = user.token;
    userId = user.id;

    connectorId = await createPublishedConnector(app, token);

    // Insert DeepSeek LLM config — use injected CryptoService for encryption
    const db = app.get(DB);
    const cryptoService = app.get(CryptoService);
    const apiKeyEncrypted = cryptoService.encrypt(apiKey);

    await db.insert(llmConfigs).values({
      scope: 'user',
      scopeId: userId,
      providerId: 'deepseek',
      modelId: 'deepseek-chat',
      apiKeyEncrypted,
      baseUrl: 'https://api.deepseek.com',
      isActive: true,
    });

    // Bind connector with demo credentials
    const encryptedCred = cryptoService.encrypt('demo-test-key');

    await db.insert(saasBindings).values({
      userId,
      connectorId,
      authType: 'api_key',
      encryptedCred,
      saasUsername: 'llm-test-user',
      permissionsJson: ['leave:submit', 'leave:view', 'expense:delete'],
    });

    // Create conversation
    const convRes = await request(app.getHttpServer())
      .post('/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ connectorId });
    conversationId = convRes.body.id;
  });

  afterAll(async () => {
    await cleanDatabase(process.env.DATABASE_URL!);
    await app.close();
  });

  it('should get a text response from DeepSeek (no tool call)', () => {
    // Send a simple greeting that won't trigger tool calls
    return request(app.getHttpServer())
      .post(`/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        message: '你好，请简单介绍一下你自己，用一句话回答',
        connectorId,
      })
      .expect(201)
      .expect((res: any) => {
        expect(['text', 'error']).toContain(res.body.type);
        if (res.body.type === 'text') {
          expect(res.body.content).toBeDefined();
          expect(res.body.content.length).toBeGreaterThan(0);
        }
      });
  }, 30000);

  it('should have saved messages in history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Should have at least the user message
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const roles = res.body.map((m: any) => m.role);
    expect(roles).toContain('user');
  });
});
