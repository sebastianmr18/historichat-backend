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
        keyTraits,
        speechTics,
        vectorDbName,
        voiceId,
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

      const character = this.characterRepo.create({
        name: name.trim(),
        role: role.trim(),
        biography: biography.trim(),
        keyTraits: Array.isArray(keyTraits) ? keyTraits : [],
        speechTics: Array.isArray(speechTics) ? speechTics : [],
        vectorDbName: typeof vectorDbName === "string" ? vectorDbName : "",
        voiceId: typeof voiceId === "string" ? voiceId : undefined,
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
