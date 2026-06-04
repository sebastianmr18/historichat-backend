/**
 * @file character-slug.ts
 * @description Utilidades para normalizar y estructurar identificadores amigables (slugs) para personajes.
 * Implementa eliminación de diacríticos, acentos, caracteres especiales y gestión de sufijos numéricos.
 */

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const DISALLOWED_SLUG_CHARS_REGEX = /[^a-z0-9\s-]/g;
const LEADING_OR_TRAILING_HYPHENS_REGEX = /^-+|-+$/g;

/**
 * Normaliza una cadena de texto para transformarla en un slug válido y amigable para URLs.
 * Remueve diacríticos, acentos, convierte a minúsculas, elimina caracteres especiales no permitidos
 * y reemplaza espacios o guiones repetidos por un guion único.
 * 
 * @param value - Cadena de texto de entrada (normalmente el nombre del personaje).
 * @returns Cadena normalizada en formato slug.
 */
export function normalizeCharacterSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(DISALLOWED_SLUG_CHARS_REGEX, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(LEADING_OR_TRAILING_HYPHENS_REGEX, "");
}

/**
 * Obtiene la base de un slug a partir de una cadena, proporcionando un valor por defecto si el slug resultante queda vacío.
 * 
 * @param value - Cadena de texto a transformar.
 * @param fallback - Valor alternativo en caso de que la normalización devuelva una cadena vacía (por defecto: "character").
 * @returns Slug resultante o la cadena del fallback.
 */
export function getCharacterSlugBase(value: string, fallback = "character"): string {
  return normalizeCharacterSlug(value) || fallback;
}

/**
 * Crea un slug con un sufijo numérico para evitar colisiones de identificadores duplicados.
 * Si la secuencia es menor o igual a 1, devuelve el slug base sin alterar.
 * 
 * @param baseSlug - El slug base ya normalizado.
 * @param sequence - Número secuencial de unicidad del personaje.
 * @returns Slug final con el sufijo numérico correspondiente si aplica.
 */
export function createSuffixedCharacterSlug(baseSlug: string, sequence: number): string {
  if (sequence <= 1) {
    return baseSlug;
  }

  return `${baseSlug}-${sequence}`;
}