/**
 * @file prompt-field-sanitizer.ts
 * @description Sanitizador de campos de prompt para prevenir ataques de inyeccion de instrucciones (prompt injection).
 * Detecta y neutraliza patrones de jailbreak en ingles y espanol, limita la longitud de los campos
 * y elimina etiquetas estructurales XML del sistema de prompts.
 */

import { logger } from "../../infrastructure/logging/logger.js";

/**
 * Patrones de expresiones regulares que detectan intentos comunes de jailbreak e inyeccion de instrucciones
 * en ingles y espanol, asi como inyecciones de etiquetas estructurales del sistema.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions?/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+if\s+you\s+have\s+no\s+(rules?|restrictions?|guidelines?)/gi,
  /pretend\s+(that\s+)?you\s+(are|have)\s+no\s+(restrictions?|limits?)/gi,
  /new\s+(system\s+)?(instruction|rule|directive|prompt)/gi,
  /ignora\s+(todas?\s+las?\s+)?instrucciones?\s+(anteriores?|previas?)/gi,
  /ahora\s+eres?\s+/gi,
  /nueva\s+(instruccion|regla)\s+del\s+sistema/gi,
  // Inyeccion de etiquetas estructurales usadas en la arquitectura de prompts del sistema
  /<\/?(system_identity|behavior_rules|retrieved_context|user_message)\s*>/gi,
  /\bDAN\b/g,
  /jailbreak(ed|ing)?/gi,
];

/**
 * Limites de longitud maxima en caracteres para cada campo de prompt.
 * Garantizan que ningun campo supere los limites razonables de los modelos y evitan abusos.
 */
export const FIELD_LIMITS = {
  name: 200,
  role: 300,
  biography: 3000,
  description: 2000,
  years: 100,
  epoch: 100,
  category: 100,
  keyTraitItem: 200,
  speechTicItem: 200,
  userMessage: 8000,
} as const;

/**
 * Clave que identifica un campo de prompt reconocido y limitado.
 */
export type PromptFieldKey = keyof typeof FIELD_LIMITS;

/**
 * Resultado de la sanitizacion de un campo de prompt.
 */
export interface SanitizeFieldResult {
  /** Valor sanitizado y posiblemente truncado. */
  value: string;
  /** Indica si el valor fue truncado por exceder el limite del campo. */
  wasTruncated: boolean;
  /** Indica si se detectaron patrones de inyeccion en el valor original. */
  hadSuspiciousContent: boolean;
}

/**
 * Comprueba si un valor coincide con algun patron de inyeccion registrado.
 *
 * @param value - Valor a evaluar.
 * @returns Verdadero si se detecta al menos un patron de inyeccion.
 */
function matchesInjectionPattern(value: string): boolean {
  return INJECTION_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(value);
  });
}

/**
 * Reemplaza los patrones de inyeccion detectados con "[...]" sin lanzar un error.
 * Esta estrategia de neutralizacion evita revelar al atacante que fue detectado.
 *
 * @param value - Texto con posibles patrones de inyeccion.
 * @returns Texto con los patrones reemplazados.
 */
function neutralizeInjectionPatterns(value: string): string {
  return INJECTION_PATTERNS.reduce((acc, p) => {
    p.lastIndex = 0;
    return acc.replace(p, "[...]");
  }, value);
}

/**
 * Sanitiza un campo de texto de prompt aplicando deteccion de inyeccion, normalizacion de saltos de linea y truncamiento.
 * Neutraliza los patrones detectados en lugar de rechazarlos, para no exponer la logica de deteccion al atacante.
 *
 * @param raw - Valor original del campo.
 * @param field - Clave del campo para aplicar el limite de longitud correspondiente.
 * @returns Objeto con el valor sanitizado y metadatos de procesamiento.
 */
export function sanitizePromptField(raw: string, field: PromptFieldKey): SanitizeFieldResult {
  let value = (raw ?? "").trim();

  const hadSuspiciousContent = matchesInjectionPattern(value);

  if (hadSuspiciousContent) {
    // Neutralizar en lugar de rechazar: evita exponer la huella de deteccion al atacante.
    value = neutralizeInjectionPatterns(value);
    logger.warn("[security] prompt_field_sanitized", {
      field,
      preview: raw.slice(0, 80),
    });
  }

  // Normalizar saltos de linea. Los valores multilinea son un vector comun de inyeccion de prompts:
  // un atacante puede insertar saltos de linea para iniciar una nueva linea de instrucciones.
  value = value.replace(/[\r\n]{2,}/g, " ").replace(/[\r\n]/g, " ").trim();

  const limit = FIELD_LIMITS[field];
  const wasTruncated = value.length > limit;

  return {
    value: wasTruncated ? value.slice(0, limit) : value,
    wasTruncated,
    hadSuspiciousContent,
  };
}

/**
 * Sanitiza un array de elementos de texto (rasgos, tics de habla) aplicando el limite por elemento.
 * Limita el array a un maximo de 20 elementos y elimina los valores vacios tras la sanitizacion.
 *
 * @param items - Lista de cadenas a sanitizar.
 * @param itemField - Campo de limite a aplicar a cada elemento del array.
 * @returns Array sanitizado con los elementos validos.
 */
export function sanitizeArrayField(
  items: string[],
  itemField: "keyTraitItem" | "speechTicItem",
): string[] {
  return items
    .slice(0, 20)
    .map((item) => sanitizePromptField(item, itemField).value)
    .filter((v) => v.length > 0);
}

/**
 * Patron de expresion regular para detectar etiquetas XML estructurales que no deben aparecer en contenido RAG.
 */
const STRUCTURAL_TAG_PATTERN =
  /<\/?(system_identity|behavior_rules|retrieved_context|user_message)\s*>/gi;

/**
 * Resultado de la sanitizacion de un fragmento de contenido RAG.
 */
export interface SanitizeRagChunkResult {
  /** Texto sanitizado con las etiquetas estructurales removidas. */
  text: string;
  /** Indica si se detectaron patrones de inyeccion tras limpiar las etiquetas. */
  flagged: boolean;
}

/**
 * Sanitiza un fragmento de texto proveniente de la base de conocimientos RAG.
 * Elimina primero las etiquetas estructurales del prompt y luego evalua si contiene patrones de inyeccion.
 *
 * @param raw - Texto original del fragmento RAG.
 * @returns Objeto con el texto limpio y una bandera indicando si fue marcado como sospechoso.
 */
export function sanitizeRagChunk(raw: string): SanitizeRagChunkResult {
  // Eliminar primero las etiquetas estructurales para prevenir ataques de ruptura de contexto.
  STRUCTURAL_TAG_PATTERN.lastIndex = 0;
  const stripped = raw.replace(STRUCTURAL_TAG_PATTERN, "");

  const flagged = matchesInjectionPattern(stripped);

  return { text: stripped, flagged };
}