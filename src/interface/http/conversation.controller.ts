import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";

export class ConversationController {
  /**
   * GET /api/conversations
   * Equivale a Conversation.objects.all()
   */
  async list(req: Request, res: Response) {
    try {
      const repo = AppDataSource.getRepository(Conversation);
      const conversations = await repo.find({
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
      res.json(conversations);
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
    
    if (!characterId) {
      return res.status(400).json({ error: "characterId es requerido" });
    }

    try {
      const repo = AppDataSource.getRepository(Conversation);
      const newConversation = repo.create({ characterId });
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
    try {
      const repo = AppDataSource.getRepository(Conversation);
      const result = await repo.delete(req.params.id);
      
      if (result.affected === 0) {
        return res.status(404).json({ error: "Conversación no encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar" });
    }
  }
}