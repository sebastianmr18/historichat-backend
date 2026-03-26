import { describe, it, expect } from "vitest";
import { getEncodingFromMimeType, getFileExtensionFromMimeType } from "../mime-utils.js";

describe("getEncodingFromMimeType", () => {
  it("returns WEBM_OPUS for webm mime types", () => {
    expect(getEncodingFromMimeType("audio/webm")).toBe("WEBM_OPUS");
    expect(getEncodingFromMimeType("audio/webm;codecs=opus")).toBe("WEBM_OPUS");
  });

  it("returns MP3 for mp3/mpeg mime types", () => {
    expect(getEncodingFromMimeType("audio/mp3")).toBe("MP3");
    expect(getEncodingFromMimeType("audio/mpeg")).toBe("MP3");
  });

  it("returns LINEAR16 for unknown mime types", () => {
    expect(getEncodingFromMimeType("audio/wav")).toBe("LINEAR16");
    expect(getEncodingFromMimeType("audio/ogg")).toBe("LINEAR16");
  });
});

describe("getFileExtensionFromMimeType", () => {
  it("returns webm for webm mime types", () => {
    expect(getFileExtensionFromMimeType("audio/webm")).toBe("webm");
  });

  it("returns mp3 for mp3/mpeg mime types", () => {
    expect(getFileExtensionFromMimeType("audio/mp3")).toBe("mp3");
    expect(getFileExtensionFromMimeType("audio/mpeg")).toBe("mp3");
  });

  it("returns wav for wav mime types", () => {
    expect(getFileExtensionFromMimeType("audio/wav")).toBe("wav");
  });

  it("returns bin for unknown mime types", () => {
    expect(getFileExtensionFromMimeType("audio/ogg")).toBe("bin");
  });
});
