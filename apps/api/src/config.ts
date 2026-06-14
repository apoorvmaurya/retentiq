import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure env variables are loaded before parsing
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-test-service-role-key-for-testing-only';
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  AI_SERVICE_URL: z
    .string()
    .url('AI_SERVICE_URL must be a valid URL')
    .default('http://localhost:8000'),
  API_PORT: z.preprocess(
    (val) => val || '3001',
    z.string().transform((v) => parseInt(v, 10)),
  ),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SLACK_WEBHOOK_URL: z.string().optional().or(z.literal('')),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.preprocess(
    (val) => val || undefined,
    z
      .string()
      .transform((v) => (v ? parseInt(v, 10) : undefined))
      .optional(),
  ),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  DISABLE_BACKGROUND_WORKERS: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .default(false),
  ENCRYPTION_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment validation failed:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  Missing env var: ${issue.path.join('.')} - ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
