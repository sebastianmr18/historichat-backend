import { z } from 'zod';
import dotenv from 'dotenv';

// Cargar .env
dotenv.config();

const envSchema = z.object({
  // Servidor
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Seguridad & CORS (Replicando ALLOWED_HOSTS / CORS_ALLOWED_ORIGINS)
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Base de Datos (PostgreSQL Supabase)
  DATABASE_URL: z.string().url({ message: "DATABASE_URL debe ser una URL válida de conexión a PostgreSQL" }),
  
  // Servicios de IA (Replicando keys de settings.py)
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY es obligatoria"),
  ELEVENLABS_API_KEY: z.string().min(1, "ELEVENLABS_API_KEY es obligatoria"),
  
  // Vector DB (ChromaDB)
  CHROMA_API_KEY: z.string().optional(),
  CHROMA_TENANT: z.string().default('default_tenant'),
  CHROMA_DATABASE: z.string().default('default_database'),
  CHROMA_HOST: z.string().optional(), // Si usas chroma en la nube o local con URL específica
});

// Validación al inicio (Crash inmediato si falla)
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Variables de entorno inválidas:', _env.error.format());
  process.exit(1);
} else {
  console.log('✅ Variables de entorno cargadas correctamente.');
}


export const env = _env.data;