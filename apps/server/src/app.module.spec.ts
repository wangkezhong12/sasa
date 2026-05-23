import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { DB } from './common/database/database.module';
import { REDIS } from './common/redis/redis.module';
import { CryptoService } from './common/crypto/crypto.service';

// Mock AI SDK modules to avoid real API calls during module compilation
jest.mock('ai', () => ({
  streamText: jest.fn(),
}));
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn().mockReturnValue(jest.fn().mockReturnValue('mock-model')),
}));

describe('AppModule', () => {
  let app: TestingModule;

  beforeEach(async () => {
    const mockDb = { select: jest.fn(), insert: jest.fn(), delete: jest.fn() };
    const mockRedis = { get: jest.fn(), set: jest.fn() };
    const mockCrypto = { encrypt: jest.fn().mockReturnValue(Buffer.alloc(0)), decrypt: jest.fn().mockReturnValue('') };

    app = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DB)
      .useValue(mockDb)
      .overrideProvider(REDIS)
      .useValue(mockRedis)
      .overrideProvider(CryptoService)
      .useValue(mockCrypto)
      .overrideGuard('JwtAuthGuard')
      .useValue({ canActivate: () => true })
      .compile();
  });

  it('should compile the module', () => {
    expect(app).toBeDefined();
  });
});
