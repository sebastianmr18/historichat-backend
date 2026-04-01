import { Character } from "../../infrastructure/database/entities/Character.js";
import { ConversationMode } from "../../shared/types.js";
import { buildBaseCharacterPrompt } from "./prompt-base.js";
import { buildModeSystemPrompt } from "./system-prompt-builder.js";

export { buildBaseCharacterPrompt };

export function buildSystemPrompt(character: Character, _mode?: ConversationMode): string {
  void _mode;
  return buildModeSystemPrompt({
    character,
    mode: "interview",
  });
}
