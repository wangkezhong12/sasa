import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { DB } from './common/database/database.module';
import { REDIS } from './common/redis/redis.module';

describe('AppModule', () => {
  let app: TestingModule;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DB)
      .useValue({ select: jest.fn(), insert: jest.fn() })
      .overrideProvider(REDIS)
      .useValue({ get: jest.fn(), set: jest.fn() })
      .compile();
  });

  it('should compile the module', () => {
    expect(app).toBeDefined();
  });
});
