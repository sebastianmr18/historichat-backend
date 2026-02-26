import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./env.js";
import { Character } from "../infrastructure/database/entities/Character.js";
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
  entities: [Character, Conversation, Message, Profile],
  migrations: migrationsPath,
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
  },
});