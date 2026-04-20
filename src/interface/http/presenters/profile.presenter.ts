import { Profile } from "../../../infrastructure/database/entities/Profile.js";
import { ProfileResponse } from "../schemas/profile.schema.js";

export function formatProfileResponse(profile: Profile): ProfileResponse {
  return {
    id: profile.id,
    username: profile.username ?? null,
    role: profile.role,
    createdAt: profile.createdAt ? profile.createdAt.toISOString() : new Date().toISOString(),
  };
}
