import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from './config/env';
import { buildOpenApiConfig } from './config/openapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: [
      'https://voceconhecedeus.com.br',
      'https://www.voceconhecedeus.com.br',
      /\.pages\.dev$/, // previews do Cloudflare Pages
      'http://localhost:8080',
    ],
    methods: ['GET', 'POST'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  SwaggerModule.setup('docs', app, document);

  await app.listen(env.PORT);
}

void bootstrap();
