/**
 * @file editorial.controller.ts
 * @description Controlador HTTP para la gestion de sub-recursos editoriales de personajes.
 * Expone endpoints CRUD protegidos por rol de administrador para gestionar citas,
 * datos curiosos, prompts sugeridos, tarjetas de contexto, entradas de linea de tiempo,
 * relaciones historicas, imagenes de galeria y bloques editoriales de cada personaje.
 */

import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { CharacterQuote } from "../../infrastructure/database/entities/CharacterQuote.js";
import { CharacterFact } from "../../infrastructure/database/entities/CharacterFact.js";
import { CharacterPrompt } from "../../infrastructure/database/entities/CharacterPrompt.js";
import { CharacterContextCard } from "../../infrastructure/database/entities/CharacterContextCard.js";
import { CharacterTimelineEntry } from "../../infrastructure/database/entities/CharacterTimelineEntry.js";
import { CharacterRelationship } from "../../infrastructure/database/entities/CharacterRelationship.js";
import { CharacterGalleryImage } from "../../infrastructure/database/entities/CharacterGalleryImage.js";
import { CharacterEditorialBlock } from "../../infrastructure/database/entities/CharacterEditorialBlock.js";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  createQuoteSchema, updateQuoteSchema,
  createFactSchema, updateFactSchema,
  createPromptSchema, updatePromptSchema,
  createContextCardSchema, updateContextCardSchema,
  createTimelineEntrySchema, updateTimelineEntrySchema,
  createRelationshipSchema, updateRelationshipSchema,
  createGalleryImageSchema, updateGalleryImageSchema,
  createEditorialBlockSchema, updateEditorialBlockSchema,
} from "./schemas/editorial.schema.js";

export class EditorialController {
  private characterRepo = AppDataSource.getRepository(Character);
  private quoteRepo = AppDataSource.getRepository(CharacterQuote);
  private factRepo = AppDataSource.getRepository(CharacterFact);
  private promptRepo = AppDataSource.getRepository(CharacterPrompt);
  private contextCardRepo = AppDataSource.getRepository(CharacterContextCard);
  private timelineRepo = AppDataSource.getRepository(CharacterTimelineEntry);
  private relationshipRepo = AppDataSource.getRepository(CharacterRelationship);
  private galleryRepo = AppDataSource.getRepository(CharacterGalleryImage);
  private editorialBlockRepo = AppDataSource.getRepository(CharacterEditorialBlock);

  private handleError(res: Response, context: string, error: unknown) {
    logger.error(`[editorial.${context}] failed`, { error });
    res.status(500).json({ error: "Internal Server Error" });
  }

  private getParam(req: Request, key: string): string {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
  }

  private async requireCharacter(id: string, res: Response): Promise<Character | null> {
    const character = await this.characterRepo.findOne({ where: { id: id as any } });
    if (!character) {
      res.status(404).json({ error: "Personaje no encontrado" });
      return null;
    }
    return character;
  }

  // ─── Quotes ───────────────────────────────────────────────────────────────

  async createQuote(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createQuoteSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const quote = this.quoteRepo.create({ ...parsed.data, characterId });
      const saved = await this.quoteRepo.save(quote);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createQuote", error);
    }
  }

  async updateQuote(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "quoteId");
      const characterId = this.getParam(req, "id");

      const parsed = updateQuoteSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const quote = await this.quoteRepo.findOne({ where: { id: id as any, characterId } });
      if (!quote) return res.status(404).json({ error: "Cita no encontrada" });

      Object.assign(quote, parsed.data);
      const saved = await this.quoteRepo.save(quote);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateQuote", error);
    }
  }

  async deleteQuote(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "quoteId");
      const characterId = this.getParam(req, "id");
      const result = await this.quoteRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Cita no encontrada" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteQuote", error);
    }
  }

  // ─── Facts ────────────────────────────────────────────────────────────────

  async createFact(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createFactSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const fact = this.factRepo.create({ ...parsed.data, characterId });
      const saved = await this.factRepo.save(fact);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createFact", error);
    }
  }

  async updateFact(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "factId");
      const characterId = this.getParam(req, "id");

      const parsed = updateFactSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const fact = await this.factRepo.findOne({ where: { id: id as any, characterId } });
      if (!fact) return res.status(404).json({ error: "Hecho no encontrado" });

      Object.assign(fact, parsed.data);
      const saved = await this.factRepo.save(fact);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateFact", error);
    }
  }

  async deleteFact(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "factId");
      const characterId = this.getParam(req, "id");
      const result = await this.factRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Hecho no encontrado" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteFact", error);
    }
  }

  // ─── Prompts ──────────────────────────────────────────────────────────────

  async createPrompt(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createPromptSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const prompt = this.promptRepo.create({ ...parsed.data, characterId });
      const saved = await this.promptRepo.save(prompt);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createPrompt", error);
    }
  }

  async updatePrompt(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "promptId");
      const characterId = this.getParam(req, "id");

      const parsed = updatePromptSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const prompt = await this.promptRepo.findOne({ where: { id: id as any, characterId } });
      if (!prompt) return res.status(404).json({ error: "Prompt no encontrado" });

      Object.assign(prompt, parsed.data);
      const saved = await this.promptRepo.save(prompt);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updatePrompt", error);
    }
  }

  async deletePrompt(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "promptId");
      const characterId = this.getParam(req, "id");
      const result = await this.promptRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Prompt no encontrado" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deletePrompt", error);
    }
  }

  // ─── Context Cards ────────────────────────────────────────────────────────

  async createContextCard(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createContextCardSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const card = this.contextCardRepo.create({ ...parsed.data, characterId });
      const saved = await this.contextCardRepo.save(card);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createContextCard", error);
    }
  }

  async updateContextCard(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "cardId");
      const characterId = this.getParam(req, "id");

      const parsed = updateContextCardSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const card = await this.contextCardRepo.findOne({ where: { id: id as any, characterId } });
      if (!card) return res.status(404).json({ error: "Tarjeta de contexto no encontrada" });

      Object.assign(card, parsed.data);
      const saved = await this.contextCardRepo.save(card);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateContextCard", error);
    }
  }

  async deleteContextCard(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "cardId");
      const characterId = this.getParam(req, "id");
      const result = await this.contextCardRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Tarjeta de contexto no encontrada" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteContextCard", error);
    }
  }

  // ─── Timeline Entries ─────────────────────────────────────────────────────

  async createTimelineEntry(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createTimelineEntrySchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const entry = this.timelineRepo.create({ ...parsed.data, characterId });
      const saved = await this.timelineRepo.save(entry);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createTimelineEntry", error);
    }
  }

  async updateTimelineEntry(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "entryId");
      const characterId = this.getParam(req, "id");

      const parsed = updateTimelineEntrySchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const entry = await this.timelineRepo.findOne({ where: { id: id as any, characterId } });
      if (!entry) return res.status(404).json({ error: "Entrada de línea de tiempo no encontrada" });

      Object.assign(entry, parsed.data);
      const saved = await this.timelineRepo.save(entry);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateTimelineEntry", error);
    }
  }

  async deleteTimelineEntry(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "entryId");
      const characterId = this.getParam(req, "id");
      const result = await this.timelineRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Entrada de línea de tiempo no encontrada" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteTimelineEntry", error);
    }
  }

  // ─── Relationships ────────────────────────────────────────────────────────

  async createRelationship(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createRelationshipSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const rel = this.relationshipRepo.create({ ...parsed.data, characterId });
      const saved = await this.relationshipRepo.save(rel);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createRelationship", error);
    }
  }

  async updateRelationship(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "relId");
      const characterId = this.getParam(req, "id");

      const parsed = updateRelationshipSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const rel = await this.relationshipRepo.findOne({ where: { id: id as any, characterId } });
      if (!rel) return res.status(404).json({ error: "Relación no encontrada" });

      Object.assign(rel, parsed.data);
      const saved = await this.relationshipRepo.save(rel);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateRelationship", error);
    }
  }

  async deleteRelationship(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "relId");
      const characterId = this.getParam(req, "id");
      const result = await this.relationshipRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Relación no encontrada" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteRelationship", error);
    }
  }

  // ─── Gallery Images ───────────────────────────────────────────────────────

  async createGalleryImage(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createGalleryImageSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const image = this.galleryRepo.create({ ...parsed.data, characterId });
      const saved = await this.galleryRepo.save(image);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createGalleryImage", error);
    }
  }

  async updateGalleryImage(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "imageId");
      const characterId = this.getParam(req, "id");

      const parsed = updateGalleryImageSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const image = await this.galleryRepo.findOne({ where: { id: id as any, characterId } });
      if (!image) return res.status(404).json({ error: "Imagen de galería no encontrada" });

      Object.assign(image, parsed.data);
      const saved = await this.galleryRepo.save(image);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateGalleryImage", error);
    }
  }

  async deleteGalleryImage(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "imageId");
      const characterId = this.getParam(req, "id");
      const result = await this.galleryRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Imagen de galería no encontrada" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteGalleryImage", error);
    }
  }

  // ─── Editorial Blocks ─────────────────────────────────────────────────────

  async createEditorialBlock(req: Request, res: Response) {
    try {
      const characterId = this.getParam(req, "id");
      if (!await this.requireCharacter(characterId, res)) return;

      const parsed = createEditorialBlockSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const block = this.editorialBlockRepo.create({ ...parsed.data, characterId });
      const saved = await this.editorialBlockRepo.save(block);
      return res.status(201).json(saved);
    } catch (error) {
      this.handleError(res, "createEditorialBlock", error);
    }
  }

  async updateEditorialBlock(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "blockId");
      const characterId = this.getParam(req, "id");

      const parsed = updateEditorialBlockSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

      const block = await this.editorialBlockRepo.findOne({ where: { id: id as any, characterId } });
      if (!block) return res.status(404).json({ error: "Bloque editorial no encontrado" });

      Object.assign(block, parsed.data);
      const saved = await this.editorialBlockRepo.save(block);
      return res.status(200).json(saved);
    } catch (error) {
      this.handleError(res, "updateEditorialBlock", error);
    }
  }

  async deleteEditorialBlock(req: Request, res: Response) {
    try {
      const id = this.getParam(req, "blockId");
      const characterId = this.getParam(req, "id");
      const result = await this.editorialBlockRepo.delete({ id: id as any, characterId });
      if (result.affected === 0) return res.status(404).json({ error: "Bloque editorial no encontrado" });
      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "deleteEditorialBlock", error);
    }
  }
}
