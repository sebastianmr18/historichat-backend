/**
 * @file speaker-mention-detector.ts
 * @description Detector de menciones a oradores en salas de debate.
 * Permite identificar de forma inteligente si el mensaje de un usuario esta dirigido
 * a uno de los dos oradores del debate por su nombre, su inicial/letra o token explicito (@A o @B).
 */

import { Character } from "../../infrastructure/database/entities/Character.js";

/**
 * Estructura del resultado de la deteccion de menciones de orador.
 */
export interface SpeakerMentionDetectionResult {
  /** Identificador unico del personaje mencionado. */
  speakerId?: string;
  /** Texto literal de la mencion detectada (ej. "@A", "Socrates"). */
  mentionText?: string;
  /** Nivel de confianza del detector (0 a 1). */
  confidence?: number;
}

/**
 * Normaliza una cadena de texto para facilitar comparaciones lexicas consistentes.
 * Elimina acentos y convierte a minusculas.
 *
 * @param value - Cadena de entrada.
 * @returns Cadena normalizada sin tildes ni mayusculas.
 */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Escapa los caracteres especiales de una cadena para su uso seguro dentro de expresiones regulares.
 *
 * @param value - Cadena con posibles caracteres especiales.
 * @returns Cadena con caracteres especiales escapados.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Recopila los nombres candidatos y sus variantes mas probables para un personaje.
 *
 * @param character - Entidad del personaje.
 * @returns Array de variantes de nombre normalizadas y unicas.
 */
function collectCandidateNames(character: Character): string[] {
  const names = new Set<string>();
  const fullName = normalize(character.name);
  if (fullName) {
    names.add(fullName);
  }

  const firstName = fullName.split(/\s+/).filter(Boolean)[0];
  if (firstName && firstName.length >= 3) {
    names.add(firstName);
  }

  return Array.from(names);
}

/**
 * Detecta menciones explicitas o vocativos por la letra designada de los oradores ("A" o "B").
 *
 * @param normalizedText - Texto de entrada ya normalizado.
 * @param speakerA - Primer orador (representado por "A").
 * @param speakerB - Segundo orador (representado por "B").
 * @returns Resultado de la deteccion o null si no hay coincidencia.
 */
function detectSpeakerByLetter(
  normalizedText: string,
  speakerA: Character,
  speakerB: Character,
): SpeakerMentionDetectionResult | null {
  const explicitTokenRegex = /@([ab])\b/g;
  const explicitMatches = Array.from(normalizedText.matchAll(explicitTokenRegex)).map((m) => m[1]);

  if (explicitMatches.length > 0) {
    const mentionsA = explicitMatches.includes("a");
    const mentionsB = explicitMatches.includes("b");
    if (mentionsA && mentionsB) {
      return { confidence: 0 };
    }
    if (mentionsA) {
      return { speakerId: speakerA.id, mentionText: "@A", confidence: 0.98 };
    }
    return { speakerId: speakerB.id, mentionText: "@B", confidence: 0.98 };
  }

  const vocativeRegex = /^(?:hey|ey|hola|oye|oigan|oiga)?\s*([ab])(?:\s|,|:|\?|!|$)/;
  const vocativeMatch = normalizedText.match(vocativeRegex);
  if (!vocativeMatch) {
    return null;
  }

  if (vocativeMatch[1] === "a") {
    return { speakerId: speakerA.id, mentionText: "A", confidence: 0.9 };
  }

  return { speakerId: speakerB.id, mentionText: "B", confidence: 0.9 };
}

/**
 * Detecta menciones buscando coincidencias en los nombres o variantes de los personajes.
 *
 * @param normalizedText - Texto de entrada ya normalizado.
 * @param speakerA - Primer orador.
 * @param speakerB - Segundo orador.
 * @returns Resultado de la deteccion o null si no hay coincidencia.
 */
function detectSpeakerByName(
  normalizedText: string,
  speakerA: Character,
  speakerB: Character,
): SpeakerMentionDetectionResult | null {
  const candidateA = collectCandidateNames(speakerA);
  const candidateB = collectCandidateNames(speakerB);

  const matchedA = candidateA.find((name) => new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(normalizedText));
  const matchedB = candidateB.find((name) => new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(normalizedText));

  if (matchedA && matchedB) {
    return { confidence: 0 };
  }

  if (matchedA) {
    return { speakerId: speakerA.id, mentionText: matchedA, confidence: 0.82 };
  }

  if (matchedB) {
    return { speakerId: speakerB.id, mentionText: matchedB, confidence: 0.82 };
  }

  return null;
}

/**
 * Detecta a qué orador del debate (A o B) se esta mencionando en el texto proporcionado.
 * Intenta primero una deteccion por letra/token explicito, y si no tiene exito, busca por nombre.
 * Filtra el resultado por un umbral minimo de confianza.
 *
 * @param params - Objeto que contiene el texto, los dos oradores y la confianza minima.
 * @returns Resultado de la deteccion (puede estar vacio si no se supero la confianza minima).
 */
export function detectDebateMentionedSpeaker(params: {
  userText: string;
  speakerA: Character;
  speakerB: Character;
  minConfidence: number;
}): SpeakerMentionDetectionResult {
  const normalizedText = normalize(params.userText);
  if (!normalizedText) {
    return {};
  }

  const letterDetection = detectSpeakerByLetter(normalizedText, params.speakerA, params.speakerB);
  if (letterDetection?.speakerId && (letterDetection.confidence ?? 0) >= params.minConfidence) {
    return letterDetection;
  }

  if (letterDetection && !letterDetection.speakerId) {
    return {};
  }

  const nameDetection = detectSpeakerByName(normalizedText, params.speakerA, params.speakerB);
  if (nameDetection?.speakerId && (nameDetection.confidence ?? 0) >= params.minConfidence) {
    return nameDetection;
  }

  return {};
}
