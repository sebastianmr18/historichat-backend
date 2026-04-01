import { Character } from "../../infrastructure/database/entities/Character.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { PromptMode } from "../../shared/types.js";

export interface PromptCharacterSummary {
  id: string;
  name: string;
  role?: string | null;
}

export interface PromptDebateContext {
  currentSpeaker: PromptCharacterSummary;
  opponent: PromptCharacterSummary;
  turnOrder?: "A" | "B";
}

export interface SystemPromptInput {
  character: Character;
  mode: PromptMode;
  isRealtime?: boolean;
  debate?: PromptDebateContext;
}

export interface SuggestionsPromptInput {
  mode: PromptMode;
  lastMessages: Array<Pick<Message, "role" | "content">>;
  characterName?: string;
  debate?: PromptDebateContext;
}