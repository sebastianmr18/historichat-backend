/**
 * @file rag.service.ts
 * @description Servicio encargado de interactuar con el motor de RAG (Generacion Aumentada por Recuperacion).
 * Recupera el contexto documental relevante para un personaje desde la base de datos vectorial ChromaDB.
 */

import { ChromaRepository } from "../../infrastructure/vector/chroma.repository.js";
import { RAGQueryDTO, RAGResponseDTO } from "../../domain/rag/rag.types.js";
import { DataSource } from "typeorm";
import { Character } from "../../infrastructure/database/entities/Character.js";

/**
 * Servicio para ejecutar busquedas y recuperar fragmentos de contexto del RAG.
 */
export class RagService {
  /**
   * Crea una instancia de RagService.
   *
   * @param dataSource - Conexion a la base de datos relacional para cargar la configuracion del personaje.
   * @param ragRepository - Repositorio vectorial (ChromaDB) para realizar la busqueda semantica.
   */
  constructor(
    private readonly dataSource: DataSource,
    private readonly ragRepository: ChromaRepository,
  ) {}

  /**
   * Ejecuta una consulta de busqueda semantica para un personaje especifico.
   * Carga el nombre de la coleccion vectorial configurado en el personaje y consulta ChromaDB.
   *
   * @param dto - Objeto de transferencia de datos con la consulta y el identificador del personaje.
   * @returns Objeto con el texto de contexto consolidado recuperado del RAG.
   * @throws Error si el personaje no existe en la base de datos.
   */
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
