import { describe, it, expect } from "vitest";
import { serializeError } from "../errors.js";

describe("serializeError", () => {
  it("serializes an Error instance with name, message, and stack", () => {
    const error = new Error("something went wrong");
    const result = serializeError(error);
    expect(result.name).toBe("Error");
    expect(result.message).toBe("something went wrong");
    expect(result.stack).toBeDefined();
  });

  it("serializes a non-Error value to its string representation", () => {
    expect(serializeError("string error")).toEqual({ message: "string error" });
    expect(serializeError(42)).toEqual({ message: "42" });
    expect(serializeError(null)).toEqual({ message: "null" });
  });
});
