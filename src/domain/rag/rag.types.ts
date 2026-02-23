export interface RAGQueryDTO {
  query: string;
  characterId: string;
  topK?: number;
}

export interface RAGResponseDTO {
  context: string;
}
