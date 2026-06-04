/**
 * @file prompt-base.ts
 * @description Constructor del bloque base del prompt de personaje.
 * Genera la descripcion narrativa inicial del personaje que se incluye en el prompt de sistema
 * de todos los modos de conversacion (entrevista, llamada y debate).
 */

import { Character } from "../../infrastructure/database/entities/Character.js";
import { sanitizeArrayField, sanitizePromptField } from "./prompt-field-sanitizer.js";

/**
 * Construye un segmento de texto con etiqueta para un atributo del personaje.
 * Retorna una cadena vacia si el valor esta vacio o es nulo.
 *
 * @param label - Etiqueta descriptiva del segmento (ej. "Rol", "Bio").
 * @param value - Valor del atributo a incluir.
 * @returns Segmento formateado con la etiqueta y el valor, o cadena vacia.
 */
function buildLabeledSegment(label: string, value?: string | null): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return "";
  }

  return ` ${label}: ${normalizedValue.replace(/[.!?]+$/u, "")}.`;
}

/**
 * Construye el bloque base del prompt de sistema para un personaje.
 * Sanitiza y normaliza todos los campos del personaje antes de concatenarlos en la instruccion.
 * Este bloque es el nucleo narrativo que define quién es el personaje y como debe comportarse.
 *
 * @param character - Entidad completa del personaje con atributos narrativos.
 * @returns Cadena de texto con la instruccion base de identidad del personaje.
 */
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