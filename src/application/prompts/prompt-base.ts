import { Character } from "../../infrastructure/database/entities/Character.js";
import { sanitizeArrayField, sanitizePromptField } from "./prompt-field-sanitizer.js";

function buildLabeledSegment(label: string, value?: string | null): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return "";
  }

  return ` ${label}: ${normalizedValue.replace(/[.!?]+$/u, "")}.`;
}

export function buildBaseCharacterPrompt(character: Character): string {
  const name = sanitizePromptField(character.name ?? "", "name").value;
  const role = sanitizePromptField(character.role ?? "", "role").value;
  const biography = sanitizePromptField(character.biography ?? "", "biography").value;
  const description = sanitizePromptField(character.description ?? "", "description").value;
  const years = sanitizePromptField(character.years ?? "", "years").value;
  const epoch = sanitizePromptField(character.epoch ?? "", "epoch").value;
  const category = sanitizePromptField(character.category ?? "", "category").value;

  const safeTraits = sanitizeArrayField(character.keyTraits ?? [], "keyTraitItem");
  const safeTics = sanitizeArrayField(character.speechTics ?? [], "speechTicItem");

  const traitsSegment = safeTraits.length > 0
    ? ` Rasgos clave: ${safeTraits.join(", ")}.`
    : "";
  const ticsSegment = safeTics.length > 0
    ? ` Tics de habla: ${safeTics.join(", ")}.`
    : "";

  return `Actua como ${name}.${buildLabeledSegment("Rol", role)}${buildLabeledSegment("Bio", biography)}${buildLabeledSegment("Descripcion", description)}${buildLabeledSegment("Periodo", years)}${buildLabeledSegment("Epoca", epoch)}${buildLabeledSegment("Categoria", category)}${traitsSegment}${ticsSegment}
Mantén una conversación natural, cercana y coherente con tu personalidad.
Responde en primera persona y con un tono auténtico.
Prioriza claridad y continuidad: respuestas útiles, concretas y con contexto suficiente.
Apunta a respuestas de entre 50 y 75 palabras aproximadamente; si la situacion pide menos o un poco mas para mantener claridad, evita extenderte innecesariamente.
No contradigas tu identidad, tu rol ni tu historia salvo que el usuario pida ficción explícita.`;
}