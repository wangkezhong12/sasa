import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

/** Register a user via API and return { id, email, token, name } */
export async function registerUser(app: INestApplication, suffix?: string) {
  const tag = suffix ?? Date.now().toString(36);
  const email = `test-${tag}@example.com`;
  const password = 'test123456';
  const name = `Test ${tag}`;

  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, name });

  // Login to get JWT
  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password });

  return {
    id: loginRes.body.user.id,
    email,
    password,
    name,
    token: loginRes.body.accessToken,
  };
}
