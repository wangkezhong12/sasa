import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.SERVER_PORT || 4000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
