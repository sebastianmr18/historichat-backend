import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../config/env.js", () => ({
  env: {
    CHROMA_HOST: "https://chroma.test",
    CHROMA_API_KEY: "test-key",
    CHROMA_TENANT: "default_tenant",
    CHROMA_DATABASE: "default_database",
  },
}));

vi.mock("../../logging/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { mockGetCollection, mockGetOrCreateCollection, mockQuery, mockUpsert } = vi.hoisted(() => ({
  mockGetCollection: vi.fn(),
  mockGetOrCreateCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("chromadb", () => ({
  CloudClient: vi.fn().mockImplementation(function (this: any) {
    this.getCollection = mockGetCollection;
    this.getOrCreateCollection = mockGetOrCreateCollection;
  }),
}));

vi.mock("@chroma-core/default-embed", () => ({
  DefaultEmbeddingFunction: vi.fn().mockImplementation(function (this: any) {}),
}));

import { ChromaRepository } from "../chroma.repository.js";

function buildCollection(docs: (string | null)[] = ["doc1", "doc2"]) {
  mockQuery.mockResolvedValue({ documents: [docs] });
  return { query: mockQuery, upsert: mockUpsert };
}

describe("ChromaRepository", () => {
  let repo: ChromaRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ChromaRepository();
  });

  describe("getContext", () => {
    it("returns empty string when collectionName is empty", async () => {
      const result = await repo.getContext("query", "");
      expect(result).toBe("");
      expect(mockGetCollection).not.toHaveBeenCalled();
    });

    it("returns empty string when collectionName is only whitespace", async () => {
      const result = await repo.getContext("query", "   ");
      expect(result).toBe("");
    });

    it("returns joined documents on successful query", async () => {
      mockGetCollection.mockResolvedValue(buildCollection(["First chunk", "Second chunk"]));

      const result = await repo.getContext("What is relativity?", "einstein_db");

      expect(result).toBe("First chunk\n---\nSecond chunk");
    });

    it("returns empty string when query returns no documents", async () => {
      mockGetCollection.mockResolvedValue(buildCollection([]));

      const result = await repo.getContext("query", "einstein_db");

      expect(result).toBe("");
    });

    it("filters null documents from query results", async () => {
      mockGetCollection.mockResolvedValue(buildCollection(["Real doc", null, "Other doc"]));

      const result = await repo.getContext("query", "db");

      expect(result).toBe("Real doc\n---\nOther doc");
    });

    it("returns empty string (graceful degradation) when getCollection throws", async () => {
      mockGetCollection.mockRejectedValue(new Error("Collection not found"));

      const result = await repo.getContext("query", "nonexistent_collection");

      expect(result).toBe("");
    });

    it("returns empty string (graceful degradation) when query throws", async () => {
      mockGetCollection.mockResolvedValue({ query: mockQuery, upsert: mockUpsert });
      mockQuery.mockRejectedValue(new Error("Query failed"));

      const result = await repo.getContext("query", "einstein_db");

      expect(result).toBe("");
    });

    it("strips double quotes from collection name before querying", async () => {
      mockGetCollection.mockResolvedValue(buildCollection(["doc"]));

      await repo.getContext("query", '"einstein db"');

      expect(mockGetCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: "einstein db" }),
      );
    });

    it("queries with nResults: 4", async () => {
      mockGetCollection.mockResolvedValue(buildCollection(["doc"]));

      await repo.getContext("query", "db");

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({ nResults: 4 }),
      );
    });
  });

  describe("upsertDocuments", () => {
    it("throws when collectionName is empty", async () => {
      await expect(repo.upsertDocuments("", [])).rejects.toThrow(
        "Collection name is required to upsert documents",
      );
    });

    it("throws when collectionName is only quotes/whitespace", async () => {
      await expect(repo.upsertDocuments('""', [])).rejects.toThrow(
        "Collection name is required to upsert documents",
      );
    });

    it("returns early without calling upsert when chunks array is empty", async () => {
      await repo.upsertDocuments("einstein_db", []);
      expect(mockGetOrCreateCollection).not.toHaveBeenCalled();
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("calls getOrCreateCollection and upsert with chunk data", async () => {
      mockGetOrCreateCollection.mockResolvedValue({ upsert: mockUpsert });
      mockUpsert.mockResolvedValue(undefined);

      const chunks = [
        { id: "chunk-1", text: "First chunk", metadata: { source: "doc.txt" } },
        { id: "chunk-2", text: "Second chunk", metadata: { source: "doc.txt" } },
      ];

      await repo.upsertDocuments("einstein_db", chunks);

      expect(mockGetOrCreateCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: "einstein_db" }),
      );
      expect(mockUpsert).toHaveBeenCalledWith({
        ids: ["chunk-1", "chunk-2"],
        documents: ["First chunk", "Second chunk"],
        metadatas: [{ source: "doc.txt" }, { source: "doc.txt" }],
      });
    });

    it("strips double quotes from collection name before upserting", async () => {
      mockGetOrCreateCollection.mockResolvedValue({ upsert: mockUpsert });
      mockUpsert.mockResolvedValue(undefined);

      await repo.upsertDocuments('"einstein db"', [{ id: "c1", text: "text", metadata: {} }]);

      expect(mockGetOrCreateCollection).toHaveBeenCalledWith(
        expect.objectContaining({ name: "einstein db" }),
      );
    });
  });
});
