export interface KnowledgeBaseUploadInput {
  characterId: string;
  userId: string;
  isAdmin?: boolean;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface KnowledgeBaseUploadResult {
  characterId: string;
  collectionName: string;
  fileName: string;
  mimeType: string;
  chunksIndexed: number;
  indexedAt: string;
}

export interface KnowledgeBaseChunkMetadata {
  [key: string]: string | number | boolean | string[] | number[] | boolean[] | null;
  characterId: string;
  userId: string;
  sourceFileName: string;
  mimeType: string;
  chunkIndex: number;
  uploadedAt: string;
}

export interface KnowledgeBaseChunk {
  id: string;
  text: string;
  metadata: KnowledgeBaseChunkMetadata;
}