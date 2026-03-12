import { Character } from "../../infrastructure/database/entities/Character.js";

export function buildSystemPrompt(character: Character): string {
  return `Actúa como ${character.name}. Rol: ${character.role}. Bio: ${character.biography}. Responde en maximo 20 palabras.`;
}
