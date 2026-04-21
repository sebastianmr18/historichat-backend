const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const DISALLOWED_SLUG_CHARS_REGEX = /[^a-z0-9\s-]/g;
const LEADING_OR_TRAILING_HYPHENS_REGEX = /^-+|-+$/g;

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

export function getCharacterSlugBase(value: string, fallback = "character"): string {
  return normalizeCharacterSlug(value) || fallback;
}

export function createSuffixedCharacterSlug(baseSlug: string, sequence: number): string {
  if (sequence <= 1) {
    return baseSlug;
  }

  return `${baseSlug}-${sequence}`;
}