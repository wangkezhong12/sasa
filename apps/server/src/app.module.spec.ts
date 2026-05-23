import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('should be defined', () => {
    const module = AppModule;
    expect(module).toBeDefined();
  });
});
