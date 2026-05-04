import { logger } from "../../infrastructure/logging/logger.js";

// Patterns targeting common jailbreak openers in English and Spanish,
// and attempts to inject our structural XML tags.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions?/gi,
  /you\s+are\s+now\s+/gi,
  /act\s+as\s+if\s+you\s+have\s+no\s+(rules?|restrictions?|guidelines?)/gi,
  /pretend\s+(that\s+)?you\s+(are|have)\s+no\s+(restrictions?|limits?)/gi,
  /new\s+(system\s+)?(instruction|rule|directive|prompt)/gi,
  /ignora\s+(todas?\s+las?\s+)?instrucciones?\s+(anteriores?|previas?)/gi,
  /ahora\s+eres?\s+/gi,
  /nueva\s+(instruccion|regla)\s+del\s+sistema/gi,
  // Structural tag injection — tags used by our prompt architecture
  /<\/?(system_identity|behavior_rules|retrieved_context|user_message)\s*>/gi,
  /\bDAN\b/g,
  /jailbreak(ed|ing)?/gi,
];

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

export type PromptFieldKey = keyof typeof FIELD_LIMITS;

export interface SanitizeFieldResult {
  value: string;
  wasTruncated: boolean;
  hadSuspiciousContent: boolean;
}

function matchesInjectionPattern(value: string): boolean {
  return INJECTION_PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(value);
  });
}

function neutralizeInjectionPatterns(value: string): string {
  return INJECTION_PATTERNS.reduce((acc, p) => {
    p.lastIndex = 0;
    return acc.replace(p, "[...]");
  }, value);
}

export function sanitizePromptField(raw: string, field: PromptFieldKey): SanitizeFieldResult {
  let value = (raw ?? "").trim();

  const hadSuspiciousContent = matchesInjectionPattern(value);

  if (hadSuspiciousContent) {
    // Neutralize instead of reject — avoids exposing detection fingerprint to attackers.
    value = neutralizeInjectionPatterns(value);
    logger.warn("[security] prompt_field_sanitized", {
      field,
      preview: raw.slice(0, 80),
    });
  }

  // Normalize line breaks. Multi-line values are a common prompt injection vector:
  // an attacker can embed newlines to start a new "instruction line" in the prompt.
  value = value.replace(/[\r\n]{2,}/g, " ").replace(/[\r\n]/g, " ").trim();

  const limit = FIELD_LIMITS[field];
  const wasTruncated = value.length > limit;

  return {
    value: wasTruncated ? value.slice(0, limit) : value,
    wasTruncated,
    hadSuspiciousContent,
  };
}

export function sanitizeArrayField(
  items: string[],
  itemField: "keyTraitItem" | "speechTicItem",
): string[] {
  return items
    .slice(0, 20)
    .map((item) => sanitizePromptField(item, itemField).value)
    .filter((v) => v.length > 0);
}

// Structural XML tags that must never appear verbatim in RAG content.
const STRUCTURAL_TAG_PATTERN =
  /<\/?(system_identity|behavior_rules|retrieved_context|user_message)\s*>/gi;

export interface SanitizeRagChunkResult {
  text: string;
  flagged: boolean;
}

export function sanitizeRagChunk(raw: string): SanitizeRagChunkResult {
  // Strip structural tags first — prevents context-break attacks even if injection patterns slip through.
  STRUCTURAL_TAG_PATTERN.lastIndex = 0;
  const stripped = raw.replace(STRUCTURAL_TAG_PATTERN, "");

  const flagged = matchesInjectionPattern(stripped);

  return { text: stripped, flagged };
}