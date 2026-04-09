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

const migrationsPath = env.NODE_ENV === "development"
  ? ["src/migrations/*.ts"]
  : ["dist/migrations/*.js"];

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: false, // Nunca usar true en producción, usa migraciones.
  logging: env.NODE_ENV === "development",
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