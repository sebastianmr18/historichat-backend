import { describe, it, expect } from "vitest";
import { generateTraceId, createTraceContext } from "../trace.js";

describe("generateTraceId", () => {
  it("generates an id with the given prefix", () => {
    const id = generateTraceId("ws");
    expect(id).toMatch(/^ws_\d+_\d+$/);
  });

  it("uses 'trace' as default prefix", () => {
    const id = generateTraceId();
    expect(id).toMatch(/^trace_\d+_\d+$/);
  });
});

describe("createTraceContext", () => {
  it("merges base trace with extras", () => {
    const ctx = createTraceContext(
      { traceId: "t1", socketId: "s1", event: "e1" },
      { conversationId: "c1" }
    );
    expect(ctx).toEqual({
      traceId: "t1",
      socketId: "s1",
      event: "e1",
      conversationId: "c1",
    });
  });

  it("generates a traceId when base is undefined", () => {
    const ctx = createTraceContext(undefined, { userId: "u1" });
    expect(ctx.traceId).toMatch(/^trace_\d+_\d+$/);
    expect(ctx.userId).toBe("u1");
  });
});
