import 'dotenv/config';
import { z } from 'zod';

// Toda variável de ambiente usada pela API passa por aqui.
// Falha no boot (fail-fast) se algo obrigatório estiver ausente ou inválido.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('vcd'),
  S3_SECRET_KEY: z.string().default('vcd_local_minio'),
  S3_BUCKET_AUDIO: z.string().default('vcd-audio'),
  S3_BUCKET_CARDS: z.string().default('vcd-cards'),
  S3_BUCKET_EXPORTS: z.string().default('vcd-exports'),

  JWT_ACCESS_SECRET: z.string().min(12),
  JWT_ACCESS_TTL: z.string().default('900s'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(60),

  JOURNAL_MASTER_KEY: z.string().min(12),
  JOURNAL_MASTER_KEY_VERSION: z.coerce.number().default(1),

  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  APPLE_BUNDLE_ID: z.string().optional().default(''),

  ANTHROPIC_API_KEY: z.string().optional().default(''),
  GOOGLE_TTS_CREDENTIALS_JSON: z.string().optional().default(''),
  OPENAI_MODERATION_API_KEY: z.string().optional().default(''),
  REVENUECAT_WEBHOOK_AUTH: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  FCM_SERVICE_ACCOUNT_JSON: z.string().optional().default(''),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_FROM: z.string().default('no-reply@voceconhecedeus.local'),

  SENTRY_DSN: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
