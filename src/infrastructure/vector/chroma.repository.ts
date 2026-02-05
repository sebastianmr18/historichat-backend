import { CloudClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import { env } from "../../config/env.js";

export class ChromaRepository {
  private client: CloudClient;
  private embedder = new DefaultEmbeddingFunction({ dtype: "fp16" });


  
  constructor() {
    this.client = new CloudClient({
      host: env.CHROMA_HOST,
      apiKey: env.CHROMA_API_KEY,
      tenant: env.CHROMA_TENANT,
      database: env.CHROMA_DATABASE,
    });
  }

  async getContext(query: string, collectionName: string): Promise<string> {
    const cleanName = collectionName.replace(/"/g, '').trim();
    console.log("Collection Name:", collectionName);
    console.log("cleanName:", cleanName);

    if (!cleanName || cleanName === "") {
      console.warn("⚠️ No vector collection defined for this character. Skipping context.");
      return ""; 
    }

    try {
      // Nota: ChromaDB maneja internamente la API Key si se configura en el cliente o via Headers

      const collection = await this.client.getCollection({
        name: cleanName,
        embeddingFunction: this.embedder,
      });

      const results = await collection.query({
        queryTexts: [query],
        nResults: 2,
      });

      // Validar si hay documentos y aplanarlos
      if (results.documents && results.documents[0]) {
        return results.documents[0].filter(doc => doc !== null).join("\n---\n");
      }

      return "";
    } catch (error) {
      console.error(`⚠️ Error consultando ChromaDB (${collectionName}):`, error);
      return ""; // No rompemos el flujo si el RAG falla
    }
  }
}