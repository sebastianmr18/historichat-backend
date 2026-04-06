import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { RAGQueryDTO, RAGResponseDTO } from "../../domain/rag/rag.types.js";
import { DataSource } from "typeorm";
import { Character } from "../../infrastructure/database/entities/Character.js";

export class RagService {
  constructor(private readonly dataSource: DataSource,
private readonly ragRepository: ChromaRepository) {}

  async execute(dto: RAGQueryDTO): Promise<RAGResponseDTO> {
    const { query, characterId } = dto;

    if (!query?.trim()) {
      return { context: "" };
    }

    const characterRepo = this.dataSource.getRepository(Character);

    const character = await characterRepo.findOne({
      where: { id: characterId },
    });

    if (!character) {
      throw new Error("Character not found");
    }

    const collectionName = character.vectorDbName || "default";

    const context = await this.ragRepository.getContext(
      query,
      collectionName,
    );

    return { context };
  }
}
