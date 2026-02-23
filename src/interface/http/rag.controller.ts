import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { RagService } from "../../application/services/rag.service.js";
import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";

const repository = new ChromaRepository();
const ragService = new RagService(AppDataSource, repository);

export const ragQueryController = async (req: Request, res: Response) => {
  try {
    const { query, characterId, topK } = req.body;

    console.log(req.body)

    if (!query || !characterId) {
      return res.status(400).json({
        error: "query y characterId son requeridos",
      });
    }


    const result = await ragService.execute({
      query,
      characterId,
    });

    return res.json(result);
  } catch (error) {
    console.error("RAG Controller Error:", error);
    return res.status(500).json({
      error: "Internal RAG error",
    });
  }
};
