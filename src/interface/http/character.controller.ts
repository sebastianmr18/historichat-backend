import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { env } from "../../config/env.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { extractUserId } from "../../api/auth.middleware.js";
import { serializeError } from "../../shared/errors.js";
import { IStorageService } from "../../shared/types.js";
import { createCharacterSchema } from "./schemas/character.schema.js";
import { withSignedImageUrls, withSignedImageUrlsBatch } from "./presenters/character.presenter.js";

export class CharacterController {
  private characterRepo = AppDataSource.getRepository(Character);

  constructor(private readonly storage: IStorageService) {}

  private handleError(res: Response, context: string, error: unknown) {
    logger.error(`[character.${context}] failed`, serializeError(error));
    res.status(500).json({ error: "Internal Server Error" });
  }

  async getAll(req: Request, res: Response) {
    try {
      const userId = extractUserId(req);
      const characters = await this.characterRepo.find({
        where: userId
          ? [{ isPublic: true }, { isPublic: false, userId }]
          : { isPublic: true },
      });
      const result = await withSignedImageUrlsBatch(this.storage, characters, env.SIGNED_URL_EXPIRES_SECONDS);
      res.json(result);
    } catch (error) {
      this.handleError(res, "getAll", error);
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = extractUserId(req);
      const character = await this.characterRepo.findOne({
        where: userId
          ? [{ id: id as any, isPublic: true }, { id: id as any, isPublic: false, userId }]
          : { id: id as any, isPublic: true },
      });

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const result = await withSignedImageUrls(this.storage, character, env.SIGNED_URL_EXPIRES_SECONDS);
      res.json(result);
    } catch (error) {
      this.handleError(res, "getById", error);
    }
  }

  async updateVoiceId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { voiceId } = req.body;
      const userId = extractUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const character = await this.characterRepo.findOne({
        where: { id: id as any, userId },
      });

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      character.voiceId = voiceId;
      await this.characterRepo.save(character);
      res.json(character);
    } catch (error) {
      this.handleError(res, "updateVoiceId", error);
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = extractUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parsed = createCharacterSchema.safeParse(req.body ?? {});

      if (!parsed.success) {
        const firstError = parsed.error.issues[0];
        return res.status(400).json({ error: firstError.message });
      }

      const character = this.characterRepo.create({
        ...parsed.data,
        userId,
      });

      const savedCharacter = await this.characterRepo.save(character);
      const result = await withSignedImageUrls(this.storage, savedCharacter, env.SIGNED_URL_EXPIRES_SECONDS);
      return res.status(201).json(result);
    } catch (error) {
      this.handleError(res, "create", error);
    }
  }
}
