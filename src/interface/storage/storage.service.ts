/**
 * @file storage.service.ts
 * @description Punto de entrada e inicializacion del servicio de almacenamiento.
 * Instancia el cliente de Supabase utilizando las llaves de rol de servicio (Service Role Key)
 * y exporta la instancia unica de SupabaseStorageService para todo el backend.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { SupabaseStorageService } from "../../infrastructure/storage/supabase-storage.service.js";

/** Cliente de Supabase configurado sin persistencia de sesion para uso en servidor. */
const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/** Instancia exportada y compartida del servicio de almacenamiento para el backend. */
export const storageService = new SupabaseStorageService(supabaseClient);
