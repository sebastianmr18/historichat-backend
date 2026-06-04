/**
 * @file env.ts
 * @description Configuración y validación de las variables de entorno de la aplicación.
 * Define el esquema esperado para la configuración del sistema mediante Zod y exporta
 * el objeto de entorno validado y tipado de forma estricta.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from "path";

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/**
 * Esquema de validación para las variables de entorno de la aplicación utilizando Zod.
 * Define tipos, valores por defecto y transformaciones requeridas para el entorno.
 */
const envSchema = z.object({
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().default("communications"),
  SIGNED_URL_EXPIRES_SECONDS: z.coerce.number().int().positive().default(3600),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_CHAT_MODEL: z.string().default('gemini-3.1-flash-lite-preview'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_CHAT_MODEL: z.string().default('openai/gpt-oss-20b'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_CHAT_MODEL: z.string().default('google/gemma-4-26b-a4b-it'),
  OPENROUTER_HTTP_REFERER: z.string().url().optional(),
  OPENROUTER_APP_TITLE: z.string().optional(),
  LLM_FALLBACK_ORDER: z.string().default('openrouter,groq,gemini'),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  GOOGLE_APPLICATION_CREDENTIALS: z
    .string()
    .min(1)
    .transform((val) => {
      return path.isAbsolute(val) ? val : path.resolve(process.cwd(), val);
    }),
  GCP_PROJECT_ID: z.string().min(1),
  CHROMA_API_KEY: z.string().optional(),
  CHROMA_TENANT: z.string().default('default_tenant'),
  CHROMA_DATABASE: z.string().default('default_database'),
  CHROMA_HOST: z.string().optional(),
  CHROMA_OPERATION_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(5),
  CHROMA_OPERATION_BASE_DELAY_MS: z.coerce.number().int().min(50).max(10000).default(300),
  CHROMA_OPERATION_MAX_DELAY_MS: z.coerce.number().int().min(100).max(30000).default(3000),
  KB_UPLOAD_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  KB_CHUNK_SIZE: z.coerce.number().int().min(200).max(8000).default(1200),
  KB_CHUNK_OVERLAP: z.coerce.number().int().min(0).max(2000).default(150),
  DEBATE_TTS_ENABLED: z.coerce.boolean().default(true),
  DEBATE_SKIP_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.35),
  DEBATE_SPEAKER_INFERENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
  GEMINI_LIVE_MODEL: z.string().default('gemini-2.5-flash-native-audio-preview-12-2025'),
  LIVE_CALL_TEST_LOGGER_ENABLED: z.coerce.boolean().default(false),
  LIVE_CALL_TEST_LOGGER_DIR: z.string().default('testing/outputs/p6-ux/live-call-logs'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Variables de entorno inválidas:', JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

/**
 * Objeto de configuración validado y fuertemente tipado de la aplicación.
 * Proporciona acceso seguro y centralizado a todas las variables de entorno definidas.
 */
export const env = _env.data;