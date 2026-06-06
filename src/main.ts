import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const uploadPath = join(process.cwd(), 'uploads');

  if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath, { recursive: true });
  }

  app.useStaticAssets(uploadPath, {
    prefix: '/uploads/',
  });

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = Number(process.env.PORT || 3000);

  await app.listen(port, '0.0.0.0');

  console.log(`SkillLens API running on port ${port}`);
}

bootstrap();