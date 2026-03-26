import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { env } from "../../config/env.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { extractUserId } from "../../api/auth.middleware.js";
import { serializeError } from "../../shared/errors.js";
import { generateTraceId } from "../../shared/trace.js";
import { IStorageService } from "../../shared/types.js";

export class ConversationController {
  private characterRepo = AppDataSource.getRepository(Character);
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private messageRepo = AppDataSource.getRepository(Message);

  constructor(private readonly storage: IStorageService) {}

  private isDebateConversation(conversation: Conversation): boolean {
    return Boolean(conversation.secondaryCharacterId);
  }

  private getSpeakerForMessage(conversation: Conversation, message: any) {
    if (message.speakerCharacter) {
      return {
        speakerId: message.speakerCharacter.id,
        speakerName: message.speakerCharacter.name,
      };
    }

    // Backward compatibility for legacy assistant messages without speaker_character_id.
    if (message.role === "assistant" && conversation.character) {
      return {
        speakerId: conversation.character.id,
        speakerName: conversation.character.name,
      };
    }

    return {
      speakerId: null,
      speakerName: null,
    };
  }

  private shapeConversationPayload(conversation: Conversation, mappedMessages: any[]) {
    const mode = this.isDebateConversation(conversation) ? "debate" : "single";
    return {
      ...conversation,
      mode,
      primaryCharacter: conversation.character,
      secondaryCharacter: conversation.secondaryCharacter ?? null,
      messages: mappedMessages,
    };
  }

  private async withSignedUrlsForConversation(conversation: Conversation) {
    const messages = (conversation.messages ?? []) as any[];

    const mappedMessages = await Promise.all(
      messages.map(async (message) => {
        const speaker = this.getSpeakerForMessage(conversation, message);

        if (!message.audioPath) return message;

        try {
          const audioUrl = await this.storage.getSignedUrl(
            env.SUPABASE_STORAGE_BUCKET,
            message.audioPath,
            env.SIGNED_URL_EXPIRES_SECONDS
          );
          return {
            ...message,
            ...speaker,
            audioUrl,
          };
        } catch {
          return {
            ...message,
            ...speaker,
            audioUrl: null,
          };
        }
      })
    );

    const messagesWithSpeaker = mappedMessages.map((message) => {
      if (Object.prototype.hasOwnProperty.call(message, "speakerId")) {
        return message;
      }
      const speaker = this.getSpeakerForMessage(conversation, message);
      return {
        ...message,
        ...speaker,
      };
    });

    return this.shapeConversationPayload(conversation, messagesWithSpeaker);
  }

  private withSignedUrls(conversations: Conversation[]) {
    return Promise.all(conversations.map((c) => this.withSignedUrlsForConversation(c)));
  }

  private getMessageAudioPaths(messages: Message[]): string[] {
    const paths = messages.flatMap((message) => {
      const values = [message.audioStorageId, message.audioPath];
      return values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value));
    });
    return [...new Set(paths)];
  }

  async list(req: Request, res: Response) {
    const userId = extractUserId(req);

    if (!userId) return res.status(401).json({ error: "Usuario no autenticado" });

    try {
      const conversations = await this.conversationRepo.find({
        where: { userId },
        relations: {
          character: true,
          secondaryCharacter: true,
          messages: { speakerCharacter: true },
        },
        order: { createdAt: "DESC", messages: { timestamp: "ASC", id: "ASC" } },
      });
      const conversationsWithAudioUrls = await this.withSignedUrls(conversations);
      res.json(conversationsWithAudioUrls);
    } catch (error) {
      res.status(500).json({ error: "Error al listar conversaciones" });
    }
  }

  async create(req: Request, res: Response) {
    const { characterId } = req.body;
    const userId = extractUserId(req);

    if (!characterId) return res.status(400).json({ error: "characterId es requerido" });
    if (!userId) return res.status(401).json({ error: "Usuario no autenticado" });

    try {
      const character = await this.characterRepo.findOne({
        where: [
          { id: characterId as any, isPublic: true },
          { id: characterId as any, isPublic: false, userId },
        ],
      });

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado o sin permisos" });
      }

      const newConversation = this.conversationRepo.create({
        character: { id: character.id },
        userId,
      });
      const savedConversation = await this.conversationRepo.save(newConversation);
      res.status(201).json(savedConversation);
    } catch (error) {
      res.status(500).json({ error: "Error al crear la conversación" });
    }
  }

  async createDebate(req: Request, res: Response) {
    const { characterIdA, characterIdB } = req.body;
    const userId = extractUserId(req);

    if (!userId) return res.status(401).json({ error: "Usuario no autenticado" });
    if (!characterIdA || !characterIdB) {
      return res.status(400).json({ error: "characterIdA y characterIdB son requeridos" });
    }
    if (characterIdA === characterIdB) {
      return res.status(400).json({ error: "characterIdA y characterIdB deben ser distintos" });
    }

    try {
      const [characterA, characterB] = await Promise.all([
        this.characterRepo.findOne({
          where: [
            { id: characterIdA as any, isPublic: true },
            { id: characterIdA as any, isPublic: false, userId },
          ],
        }),
        this.characterRepo.findOne({
          where: [
            { id: characterIdB as any, isPublic: true },
            { id: characterIdB as any, isPublic: false, userId },
          ],
        }),
      ]);

      if (!characterA || !characterB) {
        return res.status(404).json({ error: "Uno o ambos personajes no fueron encontrados o no son accesibles" });
      }

      const newConversation = this.conversationRepo.create({
        character: { id: characterA.id },
        secondaryCharacter: { id: characterB.id },
        secondaryCharacterId: characterB.id,
        userId,
      });

      const savedConversation = await this.conversationRepo.save(newConversation);
      const persistedConversation = await this.conversationRepo.findOne({
        where: { id: savedConversation.id, userId },
        relations: {
          character: true,
          secondaryCharacter: true,
          messages: { speakerCharacter: true },
        },
      });

      if (!persistedConversation) {
        return res.status(500).json({ error: "No se pudo recuperar la conversación creada" });
      }

      const payload = await this.withSignedUrlsForConversation(persistedConversation);
      res.status(201).json(payload);
    } catch (error) {
      res.status(500).json({ error: "Error al crear la conversación de debate" });
    }
  }

  async destroy(req: Request, res: Response) {
    const userId = extractUserId(req);
    const conversationId = req.params.id as any;
    const traceId = generateTraceId();

    if (!userId) return res.status(401).json({ error: "Usuario no autenticado" });

    try {
      const conversation = await this.conversationRepo.findOne({
        where: { id: conversationId, userId },
      });

      if (!conversation) return res.status(404).json({ error: "Conversación no encontrada" });

      const messages = await this.messageRepo.find({ where: { conversationId } });
      const audioPaths = this.getMessageAudioPaths(messages);

      if (audioPaths.length > 0) {
        try {
          await this.storage.deleteFiles(env.SUPABASE_STORAGE_BUCKET, audioPaths);
          logger.debug("[conversation.destroy] audio_cleanup_completed", {
            traceId,
            event: "delete_conversation",
            conversationId,
            userId,
            deletedAudioFiles: audioPaths.length,
          });
        } catch (error) {
          logger.warn("[conversation.destroy] audio_cleanup_failed", {
            traceId,
            event: "delete_conversation",
            conversationId,
            userId,
            audioPaths,
            error: serializeError(error),
          });
        }
      }

      const result = await this.conversationRepo.delete({ id: conversationId, userId });
      if (result.affected === 0) {
        return res.status(404).json({ error: "Conversación no encontrada" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar" });
    }
  }

  async retrieve(req: Request, res: Response) {
    const userId = extractUserId(req);

    if (!userId) return res.status(401).json({ error: "Usuario no autenticado" });

    try {
      const conversation = await this.conversationRepo.findOne({
        where: { id: req.params.id as any, userId },
        relations: {
          character: true,
          secondaryCharacter: true,
          messages: { speakerCharacter: true },
        },
        order: { messages: { timestamp: "ASC", id: "ASC" } },
      });

      if (!conversation) return res.status(404).json({ error: "Conversación no encontrada" });

      const conversationWithAudioUrls = await this.withSignedUrlsForConversation(conversation);
      res.json(conversationWithAudioUrls);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener la conversación" });
    }
  }
}
