// Gera packages/contracts/openapi.json sem subir servidor HTTP.
// Uso: node dist/generate-openapi.js <caminho-de-saida>
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiConfig } from './config/openapi';

async function main() {
  const out = resolve(process.argv[2] ?? '../../packages/contracts/openapi.json');
  const app = await NestFactory.create(AppModule, { logger: false, preview: true });
  app.setGlobalPrefix('v1');
  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  writeFileSync(out, JSON.stringify(document, null, 2));
  await app.close();
  console.log(`openapi.json gerado em ${out}`);
}

void main();
