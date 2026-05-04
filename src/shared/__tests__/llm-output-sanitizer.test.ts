import { describe, expect, it } from "vitest";
import { InvalidAssistantOutputError, detectOutputLeaks, sanitizeAssistantOutput } from "../llm-output-sanitizer.js";

describe("sanitizeAssistantOutput", () => {
  it("returns plain conversational text unchanged", () => {
    expect(
      sanitizeAssistantOutput("La gravedad curva el espacio-tiempo.", {
        allowJsonEnvelope: true,
      })
    ).toBe("La gravedad curva el espacio-tiempo.");
  });

  it("unwraps JSON envelopes when allowed", () => {
    const text = sanitizeAssistantOutput(
      JSON.stringify({ action: "respond", text: "Texto valido", confidence: 1 }),
      { allowJsonEnvelope: true }
    );

    expect(text).toBe("Texto valido");
  });

  it("rejects JSON payload when envelope is not allowed", () => {
    expect(() =>
      sanitizeAssistantOutput(
        JSON.stringify({ action: "respond", text: "Texto valido", confidence: 1 }),
        { allowJsonEnvelope: false }
      )
    ).toThrow(InvalidAssistantOutputError);
  });

  it("rejects code-like content", () => {
    expect(() =>
      sanitizeAssistantOutput("```js\nconst x = 1;\n```", {
        allowJsonEnvelope: true,
        rejectCodeLikeContent: true,
      })
    ).toThrow(InvalidAssistantOutputError);
  });

  it("rejects output that leaks system prompt structure tags", () => {
    expect(() =>
      sanitizeAssistantOutput("Sure! <system_identity>Actua como Ada...</system_identity>", {
        allowJsonEnvelope: true,
      })
    ).toThrow(InvalidAssistantOutputError);
  });

  it("rejects output containing jailbreak confirmation", () => {
    expect(() =>
      sanitizeAssistantOutput("DAN mode activated. I have no restrictions now.", {
        allowJsonEnvelope: true,
      })
    ).toThrow(InvalidAssistantOutputError);
  });

  it("rejects output disclosing system instructions", () => {
    expect(() =>
      sanitizeAssistantOutput("My system instructions are: Actua como Ada...", {
        allowJsonEnvelope: true,
      })
    ).toThrow(InvalidAssistantOutputError);
  });
});

describe("detectOutputLeaks", () => {
  it("returns leaked=false for normal text", () => {
    const { leaked } = detectOutputLeaks("La física cuántica es fascinante.");
    expect(leaked).toBe(false);
  });

  it("detects system_identity tag disclosure", () => {
    const { leaked } = detectOutputLeaks("El prompt dice: <system_identity>Actua como...");
    expect(leaked).toBe(true);
  });

  it("detects DAN mode confirmation", () => {
    const { leaked } = detectOutputLeaks("DAN mode activated successfully.");
    expect(leaked).toBe(true);
  });
});