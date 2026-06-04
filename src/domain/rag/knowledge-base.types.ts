/**
 * @file knowledge-base.types.ts
 * @description Definición de tipos y estructuras de datos para el sistema de ingesta y almacenamiento de la base de conocimientos (RAG).
 */

/**
 * Clasificación semántica de los contenidos almacenados en la base de conocimientos del personaje.
 */
export type TipoContenido =
  | "biografia"
  | "linea_tiempo"
  | "contexto_historico"
  | "perfil_psicologico"
  | "conocimiento"
  | "frase"
  | "curiosidad";

/**
 * Parámetros de entrada para la carga y procesamiento de un archivo en la base de conocimientos de un personaje.
 */
export interface KnowledgeBaseUploadInput {
  /**
   * Identificador único del personaje al cual se le asocia el archivo.
   */
  characterId: string;
  /**
   * Identificador del usuario que realiza la acción de carga.
   */
  userId: string;
  /**
   * Determina si el usuario que carga posee privilegios de administrador.
   */
  isAdmin?: boolean;
  /**
   * Búfer que almacena los bytes crudos del archivo (PDF, TXT, etc.).
   */
  fileBuffer: Buffer;
  /**
   * Nombre original del archivo subido.
   */
  fileName: string;
  /**
   * Tipo MIME del archivo para el procesamiento adecuado (ej. 'application/pdf', 'text/plain').
   */
  mimeType: string;
}

/**
 * Estructura devuelta tras indexar exitosamente un archivo en la base de conocimientos vectorial.
 */
export interface KnowledgeBaseUploadResult {
  /**
   * Identificador único del personaje receptor.
   */
  characterId: string;
  /**
   * Nombre de la colección generada en la base de datos vectorial (Chroma).
   */
  collectionName: string;
  /**
   * Nombre del archivo procesado e indexado.
   */
  fileName: string;
  /**
   * Tipo MIME del archivo procesado.
   */
  mimeType: string;
  /**
   * Cantidad total de fragmentos (chunks) generados, vectorizados e indexados en el sistema.
   */
  chunksIndexed: number;
  /**
   * Fecha y hora en formato ISO en la que se completó el proceso de indexación.
   */
  indexedAt: string;
}

/**
 * Metadatos adjuntos a cada vector o fragmento (chunk) en la base de datos vectorial para su posterior filtrado.
 */
export interface KnowledgeBaseChunkMetadata {
  [key: string]: string | number | boolean | string[] | number[] | boolean[] | null | undefined;
  /**
   * Identificador del personaje asociado.
   */
  characterId: string;
  /**
   * Identificador del usuario que subió el documento origen.
   */
  userId: string;
  /**
   * Nombre del archivo fuente del cual procede el fragmento.
   */
  sourceFileName: string;
  /**
   * Tipo MIME del documento fuente.
   */
  mimeType: string;
  /**
   * Posición correlativa del fragmento dentro del documento original.
   */
  chunkIndex: number;
  /**
   * Fecha y hora de carga del fragmento en formato ISO.
   */
  uploadedAt: string;
  
  // Campos semánticos opcionales (documentos estructurados de seed)
  
  /**
   * Identificador alternativo del personaje en español.
   */
  personaje_id?: string;
  /**
   * Nombre del personaje en español.
   */
  personaje_nombre?: string;
  /**
   * Clasificación semántica del tipo de contenido del fragmento.
   */
  tipo_contenido?: TipoContenido;
  /**
   * Categorización o tema secundario del fragmento.
   */
  subtipo?: string;
  /**
   * Origen o referencia del texto.
   */
  fuente?: string;
  /**
   * Año o marca temporal histórica del evento relatado en el texto (útil en líneas de tiempo).
   */
  fecha_evento?: number;
}

/**
 * Representa un fragmento de texto individual extraído y procesado con sus metadatos correspondientes.
 */
export interface KnowledgeBaseChunk {
  /**
   * Identificador único del fragmento (normalmente un UUID).
   */
  id: string;
  /**
   * Segmento textual de información.
   */
  text: string;
  /**
   * Metadatos asociados al fragmento.
   */
  metadata: KnowledgeBaseChunkMetadata;
}