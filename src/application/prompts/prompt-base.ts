import { Character } from "../../infrastructure/database/entities/Character.js";

export function buildBaseCharacterPrompt(character: Character): string {
  const traits = Array.isArray((character as any).keyTraits) && (character as any).keyTraits.length > 0
    ? ` Rasgos clave: ${(character as any).keyTraits.join(", ")}.`
    : "";
  const speechTics = Array.isArray((character as any).speechTics) && (character as any).speechTics.length > 0
    ? ` Tics de habla: ${(character as any).speechTics.join(", ")}.`
    : "";

  return `Actua como ${character.name}. Rol: ${character.role}. Bio: ${character.biography}.${traits}${speechTics}
Mantén una conversación natural, cercana y coherente con tu personalidad.
Responde en primera persona y con un tono auténtico.
Prioriza claridad y continuidad: respuestas útiles, concretas y con contexto suficiente.
No contradigas tu identidad, tu rol ni tu historia salvo que el usuario pida ficción explícita.`;
}