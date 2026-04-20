import { beforeEach, describe, expect, it, vi } from "vitest";
import { withSignedGalleryImageUrls } from "../character.presenter.js";
import { IStorageService } from "../../../../shared/types.js";

vi.mock("../../../../infrastructure/logging/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createStorageMock() {
  return {
    uploadFile: vi.fn(),
    getSignedUrl: vi.fn(),
    deleteFiles: vi.fn(),
  } satisfies IStorageService;
}

describe("character.presenter gallery signing", () => {
  let storage: ReturnType<typeof createStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = createStorageMock();
  });

  it("returns signed URLs for gallery images", async () => {
    storage.getSignedUrl.mockResolvedValue("https://signed.example/gallery-1.webp");

    const result = await withSignedGalleryImageUrls(
      storage,
      [
        {
          id: "gallery-1",
          characterId: "character-1",
          imageUrl: "gallery/einstein-1.webp",
          alt: "Einstein portrait",
          caption: null,
          credit: null,
          sourceUrl: null,
          sortOrder: 0,
          isCover: true,
        } as any,
      ],
      300,
    );

    expect(storage.getSignedUrl).toHaveBeenCalledWith("characters", "gallery/einstein-1.webp", 300);
    expect(result).toEqual([
      expect.objectContaining({
        id: "gallery-1",
        imageUrl: "https://signed.example/gallery-1.webp",
      }),
    ]);
  });

  it("normalizes gallery image paths before succeeding", async () => {
    storage.getSignedUrl.mockImplementation(async (_bucket, path) => {
      if (path === "gallery/einstein-2.webp") {
        return "https://signed.example/gallery-2.webp";
      }

      throw new Error(`missing path: ${path}`);
    });

    const result = await withSignedGalleryImageUrls(
      storage,
      [
        {
          id: "gallery-2",
          characterId: "character-1",
          imageUrl: "/characters/gallery/einstein-2.webp",
          alt: null,
          caption: null,
          credit: null,
          sourceUrl: null,
          sortOrder: 1,
          isCover: false,
        } as any,
      ],
      300,
    );

    expect(storage.getSignedUrl).toHaveBeenNthCalledWith(1, "characters", "/characters/gallery/einstein-2.webp", 300);
    expect(storage.getSignedUrl).toHaveBeenNthCalledWith(2, "characters", "characters/gallery/einstein-2.webp", 300);
    expect(storage.getSignedUrl).toHaveBeenNthCalledWith(3, "characters", "gallery/einstein-2.webp", 300);
    expect(result[0]?.imageUrl).toBe("https://signed.example/gallery-2.webp");
  });

  it("falls back to null when signing fails for one gallery image without failing the batch", async () => {
    storage.getSignedUrl.mockImplementation(async (_bucket, path) => {
      if (path === "gallery/ok.webp") {
        return "https://signed.example/gallery-ok.webp";
      }

      throw new Error(`cannot sign ${path}`);
    });

    const result = await withSignedGalleryImageUrls(
      storage,
      [
        {
          id: "gallery-ok",
          characterId: "character-1",
          imageUrl: "gallery/ok.webp",
          alt: null,
          caption: null,
          credit: null,
          sourceUrl: null,
          sortOrder: 0,
          isCover: true,
        } as any,
        {
          id: "gallery-missing",
          characterId: "character-1",
          imageUrl: "gallery/missing.webp",
          alt: null,
          caption: null,
          credit: null,
          sourceUrl: null,
          sortOrder: 1,
          isCover: false,
        } as any,
      ],
      300,
    );

    expect(result).toEqual([
      expect.objectContaining({ id: "gallery-ok", imageUrl: "https://signed.example/gallery-ok.webp" }),
      expect.objectContaining({ id: "gallery-missing", imageUrl: null }),
    ]);
  });
});