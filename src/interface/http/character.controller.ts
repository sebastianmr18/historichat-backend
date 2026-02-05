import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";

export class CharacterController {
  private characterRepo = AppDataSource.getRepository(Character);
  private messageRepo = AppDataSource.getRepository(Message);

  async getAll(req: Request, res: Response) {
    try {
      const characterRepo = AppDataSource.getRepository(Character);
      const characters = await characterRepo.find();
      res.json(characters);
    } catch (error: any) {
      /** * DEBUG: Esto imprimirá el error exacto en tu consola de Node. 
       * Busca "Relation 'app_character' does not exist" o "SSL connection error".
       */
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

  async retrieve(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const repo = AppDataSource.getRepository(Conversation);
    
    // Buscamos una sola conversación con sus relaciones
    const conversation = await repo.findOne({
      where: { id: id as any },
      relations: {
        character: true,
        messages: true,
      },
      order: {
        messages: {
          timestamp: "ASC"
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    res.json(conversation);
  } catch (error: any) {
    console.error("❌ Error en retrieve conversation:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message 
    });
  }
}
}