import { describe, expect, it } from "vitest";
import { buildBaseCharacterPrompt } from "../character-prompt.js";
import { buildModeSystemPrompt } from "../system-prompt-builder.js";
import { buildModeSuggestionsPrompt } from "../suggestions-prompt-builder.js";

describe("interview mode prompts", () => {
  const character = {
    id: "char-1",
    name: "Ada",
    role: "Scientist",
    biography: "Pioneer",
  } as any;

  it("builds a reusable base prompt from character props", () => {
    const prompt = buildBaseCharacterPrompt(character);

    expect(prompt).toContain("Actua como Ada");
    expect(prompt).toContain("Rol: Scientist");
    expect(prompt).not.toContain("Estas en modo entrevista.");
  });

  it("composes interview-specific instructions on top of base prompt", () => {
    const prompt = buildModeSystemPrompt({
      character,
      mode: "interview",
    });

    expect(prompt).toContain("Estas en modo entrevista.");
    expect(prompt).toContain("Tu rol es ser la persona entrevistada");
  });

  it("builds interview-oriented suggestions via mode strategy", () => {
    const prompt = buildModeSuggestionsPrompt({
      mode: "interview",
      lastMessages: [
      { role: "user", content: "Hola" },
      { role: "assistant", content: "Hola, encantado" },
      ] as any,
      characterName: "Ada",
    });

    expect(prompt).toContain("para que el usuario entreviste al personaje");
    expect(prompt).toContain("profundizar en lo dicho");
    expect(prompt).not.toContain("continuar la conversacion de forma natural");
  });

  it("supports dedicated call and debate overlays", () => {
    const callPrompt = buildModeSystemPrompt({
      character,
      mode: "call",
      isRealtime: true,
    });
    const debatePrompt = buildModeSystemPrompt({
      character,
      mode: "debate",
      debate: {
        currentSpeaker: { id: "char-1", name: "Ada", role: "Scientist" },
        opponent: { id: "char-2", name: "Turing", role: "Mathematician" },
        turnOrder: "A",
      },
    });

    expect(callPrompt).toContain("modo llamada en tiempo real");
    expect(debatePrompt).toContain("modo debate");
    expect(debatePrompt).toContain("frente a Turing");
  });

  it("supports dedicated call and debate suggestion strategies", () => {
    const callPrompt = buildModeSuggestionsPrompt({
      mode: "call",
      lastMessages: [{ role: "user", content: "Explicamelo" }] as any,
      characterName: "Ada",
    });
    const debatePrompt = buildModeSuggestionsPrompt({
      mode: "debate",
      lastMessages: [{ role: "user", content: "Debatan sobre IA" }] as any,
      characterName: "Ada",
      debate: {
        currentSpeaker: { id: "char-1", name: "Ada", role: "Scientist" },
        opponent: { id: "char-2", name: "Turing", role: "Mathematician" },
      },
    });

    expect(callPrompt).toContain("conversacion por voz");
    expect(debatePrompt).toContain("conduzca un debate");
    expect(debatePrompt).toContain("pedir refutacion");
  });
});
