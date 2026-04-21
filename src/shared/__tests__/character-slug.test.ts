import { describe, expect, it } from "vitest";
import { createSuffixedCharacterSlug, getCharacterSlugBase, normalizeCharacterSlug } from "../character-slug.js";

describe("character slug utilities", () => {
  it("normalizes names using the public slug rules", () => {
    expect(normalizeCharacterSlug("  Simón   Bolívar ")).toBe("simon-bolivar");
    expect(normalizeCharacterSlug("Sócrates")).toBe("socrates");
    expect(normalizeCharacterSlug("Leonardo da Vinci")).toBe("leonardo-da-vinci");
  });

  it("falls back when normalization would produce an empty slug", () => {
    expect(getCharacterSlugBase("!!!")).toBe("character");
  });

  it("applies numeric suffixes deterministically", () => {
    expect(createSuffixedCharacterSlug("newton", 1)).toBe("newton");
    expect(createSuffixedCharacterSlug("newton", 2)).toBe("newton-2");
    expect(createSuffixedCharacterSlug("newton", 3)).toBe("newton-3");
  });
});