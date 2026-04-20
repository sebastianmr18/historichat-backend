import { Character } from "../../infrastructure/database/entities/Character.js";

function buildLabeledSegment(label: string, value?: string | null): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return "";
  }

  return ` ${label}: ${normalizedValue.replace(/[.!?]+$/u, "")}.`;
}

export function buildBaseCharacterPrompt(character: Character): string {
  const description = buildLabeledSegment("Descripcion", character.description);
  const years = buildLabeledSegment("Periodo", character.years);
  const epoch = buildLabeledSegment("Epoca", character.epoch);
  const category = buildLabeledSegment("Categoria", character.category);
  const traits = Array.isArray(character.keyTraits) && character.keyTraits.length > 0
    ? ` Rasgos clave: ${character.keyTraits.join(", ")}.`
    : "";
  const speechTics = Array.isArray(character.speechTics) && character.speechTics.length > 0
    ? ` Tics de habla: ${character.speechTics.join(", ")}.`
    : "";

  return `Actua como ${character.name}.${buildLabeledSegment("Rol", character.role)}${buildLabeledSegment("Bio", character.biography)}${description}${years}${epoch}${category}${traits}${speechTics}
Mantén una conversación natural, cercana y coherente con tu personalidad.
Responde en primera persona y con un tono auténtico.
Prioriza claridad y continuidad: respuestas útiles, concretas y con contexto suficiente.
Apunta a respuestas de entre 50 y 75 palabras aproximadamente; si la situacion pide menos o un poco mas para mantener claridad, evita extenderte innecesariamente.
No contradigas tu identidad, tu rol ni tu historia salvo que el usuario pida ficción explícita.`;
}