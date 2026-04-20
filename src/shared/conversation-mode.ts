import { LegacyConversationMode, ConversationMode } from "./types.js";

export function normalizeConversationMode(mode?: LegacyConversationMode): {
  originalMode: LegacyConversationMode | undefined;
  effectiveMode: ConversationMode;
} {
  return {
    originalMode: mode,
    effectiveMode: "interview",
  };
}
