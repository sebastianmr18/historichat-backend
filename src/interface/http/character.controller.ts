import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { AppDataSource } from "../../config/database.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { Message } from "../../infrastructure/database/entities/Message.js";

export class CharacterController {
  private characterRepo = AppDataSource.getRepository(Character);
  private messageRepo = AppDataSource.getRepository(Message);

  private getUserId(req: Request): string | undefined {
    if (!req.user) return undefined;
    if (typeof req.user === "string") return req.user;
    console.log(req.user);

    const payload = req.user as JwtPayload & { id?: string };
    return (typeof payload.sub === "string" ? payload.sub : undefined) ?? payload.id;
  }

  async getAll(req: Request, res: Response) {
    try {
      const characterRepo = AppDataSource.getRepository(Character);
      const userId = this.getUserId(req);
      const characters = await characterRepo.find({
        where: userId
          ? [{ isPublic: true }, { isPublic: false, userId }]
          : { isPublic: true },
      });
      res.json(characters);
    } catch (error: any) {
      console.error("❌ Error detallado en getAll:", {
        message: error.message,
        stack: error.stack,
        query: error.query
      });
      
      res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message 
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const characterRepo = AppDataSource.getRepository(Character);
      const userId = this.getUserId(req);
      const character = await characterRepo.findOne({
        where: userId
          ? [{ id: id as any, isPublic: true }, { id: id as any, isPublic: false, userId }]
          : { id: id as any, isPublic: true },
      });
      
      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }
      
      res.json(character);
    } catch (error: any) {
      console.error("❌ Error en getById:", {
        message: error.message,
        stack: error.stack,
        query: error.query
      });
      
      res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message 
      });
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
      res.status(500).json({ 
        error: "Internal Server Error", 
        details: error.message 
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = this.getUserId(req);

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
      console.error("❌ Error en create:", {
        message: error.message,
        stack: error.stack,
        query: error.query,
      });

      return res.status(500).json({
        error: "Internal Server Error",
        details: error.message,
      });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      console.log("Fetching messages for conversation ID:", req.params.id);
      const messages = await this.messageRepo.find({
        where: { conversationId: req.params.id as any },
        order: { timestamp: "ASC" },
      });
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}