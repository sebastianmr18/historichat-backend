import { describe, expect, it } from "vitest";
import { normalizeConversationMode } from "../conversation-mode.js";

describe("normalizeConversationMode", () => {
  it("maps interview to interview", () => {
    const result = normalizeConversationMode("interview");

    expect(result.originalMode).toBe("interview");
    expect(result.effectiveMode).toBe("interview");
  });

  it("maps legacy chat to interview", () => {
    const result = normalizeConversationMode("chat");

    expect(result.originalMode).toBe("chat");
    expect(result.effectiveMode).toBe("interview");
  });

  it("maps missing mode to interview", () => {
    const result = normalizeConversationMode(undefined);

    expect(result.originalMode).toBeUndefined();
    expect(result.effectiveMode).toBe("interview");
  });
});
