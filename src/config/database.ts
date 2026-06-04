/**
 * @file database.ts
 * @description Configuración e inicialización de la conexión de TypeORM con la base de datos PostgreSQL.
 * Define la entidad y la ruta de migraciones que se cargarán en la instancia del DataSource.
 */

import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env.js";
import { Character } from "../infrastructure/database/entities/Character.js";
import { CharacterCopyOverride } from "../infrastructure/database/entities/CharacterCopyOverride.js";
import { CharacterContextCard } from "../infrastructure/database/entities/CharacterContextCard.js";
import { CharacterEditorialBlock } from "../infrastructure/database/entities/CharacterEditorialBlock.js";
import { CharacterFact } from "../infrastructure/database/entities/CharacterFact.js";
import { CharacterGalleryImage } from "../infrastructure/database/entities/CharacterGalleryImage.js";
import { CharacterPrompt } from "../infrastructure/database/entities/CharacterPrompt.js";
import { CharacterQuote } from "../infrastructure/database/entities/CharacterQuote.js";
import { CharacterRelationship } from "../infrastructure/database/entities/CharacterRelationship.js";
import { CharacterTimelineEntry } from "../infrastructure/database/entities/CharacterTimelineEntry.js";
import { CharacterTimelineRelationship } from "../infrastructure/database/entities/CharacterTimelineRelationship.js";
import { ContentVariantCopy } from "../infrastructure/database/entities/ContentVariantCopy.js";
import { Conversation } from "../infrastructure/database/entities/Conversation.js";
import { Message } from "../infrastructure/database/entities/Message.js";
import { Profile } from "../infrastructure/database/entities/Profile.js";
import { TruncatedTypeOrmLogger } from "../infrastructure/logging/typeorm-query-logger.js";

/**
 * Ruta de almacenamiento y carga para los archivos de migración de base de datos.
 * Varía según el entorno de ejecución (TypeScript en desarrollo, JavaScript en producción).
 */
const migrationsPath = env.NODE_ENV === "development"
  ? ["src/migrations/*.ts"]
  : ["dist/migrations/*.js"];

/**
 * Instancia principal de TypeORM DataSource configurada para PostgreSQL.
 * Proporciona el pool de conexiones, mapeo de entidades, registro de consultas mediante
 * TruncatedTypeOrmLogger y ejecución segura con SSL habilitado.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: false, // Nunca usar true en producción, usa migraciones.
  logging: env.NODE_ENV === "development",
  logger: new TruncatedTypeOrmLogger(),
  entities: [
    Character,
    CharacterCopyOverride,
    CharacterContextCard,
    CharacterEditorialBlock,
    CharacterFact,
    CharacterGalleryImage,
    CharacterPrompt,
    CharacterQuote,
    CharacterRelationship,
    CharacterTimelineEntry,
    CharacterTimelineRelationship,
    ContentVariantCopy,
    Conversation,
    Message,
    Profile,
  ],
  migrations: migrationsPath,
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
  },
});