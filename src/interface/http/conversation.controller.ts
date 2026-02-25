import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { AppDataSource } from "../../config/database.js";
import { env } from "../../config/env.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { storageService } from "../storage/storage.service.js";

export class ConversationController {
  private getUserId(req: Request): string | undefined {
    if (!req.user) return undefined;
    if (typeof req.user === "string") return req.user;

    const payload = req.user as JwtPayload & { id?: string };
    return (typeof payload.sub === "string" ? payload.sub : undefined) ?? payload.id;
  }

  private async withSignedUrlsForConversation(conversation: Conversation) {
    const messages = (conversation.messages ?? []) as any[];

    const mappedMessages = await Promise.all(
      messages.map(async (message) => {
        if (!message.audioPath) {
          return message;
        }

        try {
          const audioUrl = await storageService.getSignedUrl(
            env.SUPABASE_STORAGE_BUCKET,
            message.audioPath,
            env.SIGNED_URL_EXPIRES_SECONDS
          );

          return {
            ...message,
            audioUrl,
          };
        } catch {
          return {
            ...message,
            audioUrl: null,
          };
        }
      })
    );

    return {
      ...conversation,
      messages: mappedMessages,
    };
  }

  private async withSignedUrls(conversations: Conversation[]) {
    return Promise.all(conversations.map((conversation) => this.withSignedUrlsForConversation(conversation)));
  }

  /**
   * GET /api/conversations
   * Equivale a Conversation.objects.all()
   */
  async list(req: Request, res: Response) {
    const userId = this.getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    try {
      const repo = AppDataSource.getRepository(Conversation);
      const conversations = await repo.find({
              where: { userId },
              // Cargamos ambas relaciones: el personaje y los mensajes
              relations: {
                character: true,
                messages: true,
              },
              // Ordenamos las conversaciones por fecha de creación (desc)
              // Y los mensajes dentro de ellas por su timestamp (asc)
              order: {
                createdAt: "DESC",
                messages: {
                  timestamp: "ASC"
                }
              }
            });
      const conversationsWithAudioUrls = await this.withSignedUrls(conversations);
      res.json(conversationsWithAudioUrls);
    } catch (error) {
      res.status(500).json({ error: "Error al listar conversaciones" });
    }
  }

  /**
   * POST /api/conversations
   * Reemplaza la lógica de creación del ViewSet
   */
  async create(req: Request, res: Response) {
    const { characterId } = req.body;
    const userId = this.getUserId(req);
    
    if (!characterId) {
      return res.status(400).json({ error: "characterId es requerido" });
    }

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    try {
      const characterRepo = AppDataSource.getRepository(Character);
      const character = await characterRepo.findOne({
        where: [
          { id: characterId as any, isPublic: true },
          { id: characterId as any, isPublic: false, userId },
        ],
      });

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado o sin permisos" });
      }

      const repo = AppDataSource.getRepository(Conversation);
      const newConversation = repo.create({
        character: { id: character.id },
        userId,
      });
      const savedConversation = await repo.save(newConversation);
      
      res.status(201).json(savedConversation);
    } catch (error) {
      res.status(500).json({ error: "Error al crear la conversación" });
    }
  }

  /**
   * DELETE /api/conversations/:id
   */
  async destroy(req: Request, res: Response) {
    const userId = this.getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    try {
      const repo = AppDataSource.getRepository(Conversation);
      const result = await repo.delete({ id: req.params.id as any, userId });
      
      if (result.affected === 0) {
        return res.status(404).json({ error: "Conversación no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar" });
    }
  }

  async retrieve(req: Request, res: Response) {
    const userId = this.getUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    try {
      const repo = AppDataSource.getRepository(Conversation);
      const conversation = await repo.findOne({
        where: { id: req.params.id as any, userId },
        relations: {
          character: true,
          messages: true,
        },
        order: {
          messages: {
            timestamp: "ASC",
          },
        },
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversación no encontrada" });
      }

      const conversationWithAudioUrls = await this.withSignedUrlsForConversation(conversation);
      res.json(conversationWithAudioUrls);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener la conversación" });
    }
  }
}