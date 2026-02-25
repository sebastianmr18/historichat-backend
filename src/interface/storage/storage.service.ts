import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";
import { SupabaseStorageService } from "../../infrastructure/storage/supabase-storage.service.js";

const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

export const storageService = new SupabaseStorageService(supabaseClient);
