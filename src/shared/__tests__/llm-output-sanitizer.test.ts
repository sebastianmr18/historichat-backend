import { describe, expect, it } from "vitest";
import { InvalidAssistantOutputError, sanitizeAssistantOutput } from "../llm-output-sanitizer.js";

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
});