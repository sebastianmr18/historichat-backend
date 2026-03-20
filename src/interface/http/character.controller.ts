import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { extractUserId } from "../../api/auth.middleware.js";

export class CharacterController {
  private characterRepo = AppDataSource.getRepository(Character);

  async getAll(req: Request, res: Response) {
    try {
      const userId = extractUserId(req);
      const characters = await this.characterRepo.find({
        where: userId
          ? [{ isPublic: true }, { isPublic: false, userId }]
          : { isPublic: true },
      });
      res.json(characters);
    } catch (error: any) {
      logger.error("[character.getAll] failed", {
        message: error.message,
        stack: error.stack,
        query: error.query,
      });
      res.status(500).json({ error: "Internal Server Error" });
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

      res.json(character);
    } catch (error: any) {
      logger.error("[character.getById] failed", {
        message: error.message,
        stack: error.stack,
        query: error.query,
      });
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async updateVoiceId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { voiceId } = req.body;
      const character = await this.characterRepo.findOne({ where: { id: id as any } });

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      character.voiceId = voiceId;
      await this.characterRepo.save(character);
      res.json(character);
    } catch (error: any) {
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = extractUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const {
        name,
        role,
        biography,
        description,
        keyTraits,
        speechTics,
        vectorDbName,
        voiceId,
        themeColor,
        themeColorLight,
        years,
        category,
        epoch,
        quote,
        imageUrl,
        badge,
        topics,
        isPublic,
      } = req.body ?? {};

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "El campo 'name' es obligatorio" });
      }

      if (typeof role !== "string" || !role.trim()) {
        return res.status(400).json({ error: "El campo 'role' es obligatorio" });
      }

      if (typeof biography !== "string" || !biography.trim()) {
        return res.status(400).json({ error: "El campo 'biography' es obligatorio" });
      }

      if (badge !== undefined && badge !== null && badge !== "popular" && badge !== "new") {
        return res.status(400).json({ error: "El campo 'badge' debe ser 'popular' o 'new'" });
      }

      if (
        topics !== undefined &&
        topics !== null &&
        (!Array.isArray(topics) || topics.some((topic) => typeof topic !== "string"))
      ) {
        return res.status(400).json({ error: "El campo 'topics' debe ser un arreglo de strings" });
      }

      const character = this.characterRepo.create({
        name: name.trim(),
        role: role.trim(),
        biography: biography.trim(),
        description: typeof description === "string" ? description.trim() : undefined,
        keyTraits: Array.isArray(keyTraits) ? keyTraits : [],
        speechTics: Array.isArray(speechTics) ? speechTics : [],
        vectorDbName: typeof vectorDbName === "string" ? vectorDbName : "",
        voiceId: typeof voiceId === "string" ? voiceId : undefined,
        themeColor: typeof themeColor === "string" ? themeColor : undefined,
        themeColorLight: typeof themeColorLight === "string" ? themeColorLight : undefined,
        years: typeof years === "string" ? years : undefined,
        category: typeof category === "string" ? category : undefined,
        epoch: typeof epoch === "string" ? epoch : undefined,
        quote: typeof quote === "string" ? quote : undefined,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
        badge: badge === "popular" || badge === "new" ? badge : undefined,
        topics: Array.isArray(topics) ? topics : [],
        isPublic: typeof isPublic === "boolean" ? isPublic : false,
        userId,
      });

      const savedCharacter = await this.characterRepo.save(character);
      return res.status(201).json(savedCharacter);
    } catch (error: any) {
      logger.error("[character.create] failed", {
        message: error.message,
        stack: error.stack,
        query: error.query,
      });
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}
