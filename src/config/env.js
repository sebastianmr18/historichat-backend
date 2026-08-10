"use strict";
/**
 * @file env.ts
 * @description Configuración y validación de las variables de entorno de la aplicación.
 * Define el esquema esperado para la configuración del sistema mediante Zod y exporta
 * el objeto de entorno validado y tipado de forma estricta.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var zod_1 = require("zod");
var dotenv_1 = require("dotenv");
var path_1 = require("path");
if (process.env.NODE_ENV !== 'production') {
    dotenv_1.default.config();
}
/**
 * Esquema de validación para las variables de entorno de la aplicación utilizando Zod.
 * Define tipos, valores por defecto y transformaciones requeridas para el entorno.
 */
var envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('8000'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    DATABASE_URL: zod_1.z.string().url(),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    SUPABASE_JWT_SECRET: zod_1.z.string().min(1),
    SUPABASE_STORAGE_BUCKET: zod_1.z.string().default("communications"),
    SIGNED_URL_EXPIRES_SECONDS: zod_1.z.coerce.number().int().positive().default(3600),
    GEMINI_API_KEY: zod_1.z.string().min(1),
    GEMINI_CHAT_MODEL: zod_1.z.string().default('gemini-3.1-flash-lite-preview'),
    GROQ_API_KEY: zod_1.z.string().optional(),
    GROQ_CHAT_MODEL: zod_1.z.string().default('openai/gpt-oss-20b'),
    OPENROUTER_API_KEY: zod_1.z.string().optional(),
    OPENROUTER_CHAT_MODEL: zod_1.z.string().default('google/gemma-4-26b-a4b-it'),
    OPENROUTER_HTTP_REFERER: zod_1.z.string().url().optional(),
    OPENROUTER_APP_TITLE: zod_1.z.string().optional(),
    OPENROUTER_MAX_TOKENS: zod_1.z.coerce.number().int().positive().default(1024),
    LLM_FALLBACK_ORDER: zod_1.z.string().default('openrouter,groq,gemini'),
    LLM_REQUEST_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(6000),
    GOOGLE_APPLICATION_CREDENTIALS: zod_1.z
        .string()
        .min(1)
        .transform(function (val) {
        return path_1.default.isAbsolute(val) ? val : path_1.default.resolve(process.cwd(), val);
    }),
    GCP_PROJECT_ID: zod_1.z.string().min(1),
    CHROMA_API_KEY: zod_1.z.string().optional(),
    CHROMA_TENANT: zod_1.z.string().default('default_tenant'),
    CHROMA_DATABASE: zod_1.z.string().default('default_database'),
    CHROMA_HOST: zod_1.z.string().optional(),
    CHROMA_OPERATION_MAX_RETRIES: zod_1.z.coerce.number().int().min(1).max(10).default(5),
    CHROMA_OPERATION_BASE_DELAY_MS: zod_1.z.coerce.number().int().min(50).max(10000).default(300),
    CHROMA_OPERATION_MAX_DELAY_MS: zod_1.z.coerce.number().int().min(100).max(30000).default(3000),
    KB_UPLOAD_MAX_FILE_SIZE_BYTES: zod_1.z.coerce.number().int().positive().default(10 * 1024 * 1024),
    KB_CHUNK_SIZE: zod_1.z.coerce.number().int().min(200).max(8000).default(1200),
    KB_CHUNK_OVERLAP: zod_1.z.coerce.number().int().min(0).max(2000).default(150),
    DEBATE_TTS_ENABLED: zod_1.z.coerce.boolean().default(true),
    DEBATE_SKIP_CONFIDENCE_THRESHOLD: zod_1.z.coerce.number().min(0).max(1).default(0.35),
    DEBATE_SPEAKER_INFERENCE_THRESHOLD: zod_1.z.coerce.number().min(0).max(1).default(0.7),
    GEMINI_LIVE_MODEL: zod_1.z.string().default('gemini-2.5-flash-native-audio-preview-12-2025'),
    LIVE_CALL_TEST_LOGGER_ENABLED: zod_1.z.coerce.boolean().default(false),
    LIVE_CALL_TEST_LOGGER_DIR: zod_1.z.string().default('testing/outputs/p6-ux/live-call-logs'),
});
var _env = envSchema.safeParse(process.env);
if (!_env.success) {
    console.error('❌ Variables de entorno inválidas:', JSON.stringify(_env.error.format(), null, 2));
    process.exit(1);
}
/**
 * Objeto de configuración validado y fuertemente tipado de la aplicación.
 * Proporciona acceso seguro y centralizado a todas las variables de entorno definidas.
 */
exports.env = _env.data;
