/**
 * @file rag.types.ts
 * @description Definición de DTOs (Data Transfer Objects) para las consultas RAG.
 */

/**
 * Objeto de transferencia de datos para realizar una consulta RAG en la base de conocimientos.
 */
export interface RAGQueryDTO {
  /**
   * Consulta de texto o pregunta enviada por el usuario o generada por el LLM.
   */
  query: string;
  /**
   * Identificador único del personaje cuya base de conocimientos será consultada.
   */
  characterId: string;
  /**
   * Cantidad máxima de fragmentos relevantes (vecinos más cercanos) a recuperar de la base de datos vectorial.
   */
  topK?: number;
}

/**
 * Objeto de transferencia de datos con el contexto de información recuperado del RAG.
 */
export interface RAGResponseDTO {
  /**
   * Bloque consolidado de texto que contiene los fragmentos históricos e información relevante recuperada.
   */
  context: string;
}
