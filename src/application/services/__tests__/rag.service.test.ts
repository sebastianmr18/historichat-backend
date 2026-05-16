import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../infrastructure/logging/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { RagService } from "../rag.service.js";

describe("RagService", () => {
  let service: RagService;
  let mockFindOne: ReturnType<typeof vi.fn>;
  let mockGetContext: ReturnType<typeof vi.fn>;
  let mockDataSource: any;
  let chromaRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOne = vi.fn();
    mockGetContext = vi.fn().mockResolvedValue("RAG context");
    mockDataSource = {
      getRepository: vi.fn().mockReturnValue({ findOne: mockFindOne }),
    };
    chromaRepo = { getContext: mockGetContext };
    service = new RagService(mockDataSource, chromaRepo);
  });

  describe("execute", () => {
    it("returns empty context when query is blank whitespace", async () => {
      const result = await service.execute({ query: "   ", characterId: "char-1" });
      expect(result).toEqual({ context: "" });
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it("returns empty context when query is null", async () => {
      const result = await service.execute({ query: null as any, characterId: "char-1" });
      expect(result).toEqual({ context: "" });
      expect(mockFindOne).not.toHaveBeenCalled();
    });

    it("returns empty context when query is undefined", async () => {
      const result = await service.execute({ query: undefined as any, characterId: "char-1" });
      expect(result).toEqual({ context: "" });
    });

    it("throws Error when character is not found", async () => {
      mockFindOne.mockResolvedValue(null);
      await expect(
        service.execute({ query: "What is relativity?", characterId: "missing-id" }),
      ).rejects.toThrow("Character not found");
    });

    it("uses vectorDbName as the collection name when set", async () => {
      mockFindOne.mockResolvedValue({ id: "char-1", vectorDbName: "einstein_db" });
      await service.execute({ query: "What is relativity?", characterId: "char-1" });
      expect(mockGetContext).toHaveBeenCalledWith("What is relativity?", "einstein_db");
    });

    it("falls back to 'default' collection when vectorDbName is null", async () => {
      mockFindOne.mockResolvedValue({ id: "char-1", vectorDbName: null });
      await service.execute({ query: "Some query", characterId: "char-1" });
      expect(mockGetContext).toHaveBeenCalledWith("Some query", "default");
    });

    it("falls back to 'default' collection when vectorDbName is empty string", async () => {
      mockFindOne.mockResolvedValue({ id: "char-1", vectorDbName: "" });
      await service.execute({ query: "Some query", characterId: "char-1" });
      expect(mockGetContext).toHaveBeenCalledWith("Some query", "default");
    });

    it("returns context from chromaRepository on success", async () => {
      mockFindOne.mockResolvedValue({ id: "char-1", vectorDbName: "einstein_db" });
      mockGetContext.mockResolvedValue("Discovered photoelectric effect in 1905.");
      const result = await service.execute({ query: "What is relativity?", characterId: "char-1" });
      expect(result).toEqual({ context: "Discovered photoelectric effect in 1905." });
    });

    it("queries the Character repository with the provided characterId", async () => {
      mockFindOne.mockResolvedValue({ id: "char-42", vectorDbName: "db" });
      await service.execute({ query: "query", characterId: "char-42" });
      expect(mockDataSource.getRepository).toHaveBeenCalled();
      expect(mockFindOne).toHaveBeenCalledWith({ where: { id: "char-42" } });
    });
  });
});
