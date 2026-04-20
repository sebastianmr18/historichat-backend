import { describe, expect, it } from "vitest";
import { detectDebateMentionedSpeaker } from "../speaker-mention-detector.js";

const SPEAKER_A = {
  id: "char-a",
  name: "Ada Lovelace",
} as any;

const SPEAKER_B = {
  id: "char-b",
  name: "Hannah Arendt",
} as any;

describe("detectDebateMentionedSpeaker", () => {
  it("detects speaker B from vocative letter mention", () => {
    const result = detectDebateMentionedSpeaker({
      userText: "ey B, que opinas de esto?",
      speakerA: SPEAKER_A,
      speakerB: SPEAKER_B,
      minConfidence: 0.7,
    });

    expect(result.speakerId).toBe("char-b");
    expect(result.mentionText).toBe("B");
  });

  it("detects speaker A from @ mention", () => {
    const result = detectDebateMentionedSpeaker({
      userText: "@A responde primero",
      speakerA: SPEAKER_A,
      speakerB: SPEAKER_B,
      minConfidence: 0.7,
    });

    expect(result.speakerId).toBe("char-a");
    expect(result.mentionText).toBe("@A");
  });

  it("detects speaker by character name", () => {
    const result = detectDebateMentionedSpeaker({
      userText: "Hannah, cual es tu postura?",
      speakerA: SPEAKER_A,
      speakerB: SPEAKER_B,
      minConfidence: 0.7,
    });

    expect(result.speakerId).toBe("char-b");
    expect(result.mentionText).toBe("hannah");
  });

  it("returns empty when no mention is found", () => {
    const result = detectDebateMentionedSpeaker({
      userText: "Que opinan sobre esto?",
      speakerA: SPEAKER_A,
      speakerB: SPEAKER_B,
      minConfidence: 0.7,
    });

    expect(result.speakerId).toBeUndefined();
  });

  it("returns empty for ambiguous @A and @B mention", () => {
    const result = detectDebateMentionedSpeaker({
      userText: "@A y @B opinen por favor",
      speakerA: SPEAKER_A,
      speakerB: SPEAKER_B,
      minConfidence: 0.7,
    });

    expect(result.speakerId).toBeUndefined();
  });
});
