import { Request, Response } from "express";
import { AppDataSource } from "../../config/database.js";
import { env } from "../../config/env.js";
import { Character } from "../../infrastructure/database/entities/Character.js";
import { CharacterContextCard } from "../../infrastructure/database/entities/CharacterContextCard.js";
import { CharacterCopyOverride } from "../../infrastructure/database/entities/CharacterCopyOverride.js";
import { CharacterEditorialBlock } from "../../infrastructure/database/entities/CharacterEditorialBlock.js";
import { CharacterFact } from "../../infrastructure/database/entities/CharacterFact.js";
import { CharacterGalleryImage } from "../../infrastructure/database/entities/CharacterGalleryImage.js";
import { CharacterPrompt } from "../../infrastructure/database/entities/CharacterPrompt.js";
import { CharacterQuote } from "../../infrastructure/database/entities/CharacterQuote.js";
import { CharacterRelationship } from "../../infrastructure/database/entities/CharacterRelationship.js";
import { CharacterTimelineEntry } from "../../infrastructure/database/entities/CharacterTimelineEntry.js";
import { ContentVariantCopy } from "../../infrastructure/database/entities/ContentVariantCopy.js";
import { Conversation } from "../../infrastructure/database/entities/Conversation.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { extractUserId } from "../../api/auth.utils.js";
import { serializeError } from "../../shared/errors.js";
import { createSuffixedCharacterSlug, getCharacterSlugBase, normalizeCharacterSlug } from "../../shared/character-slug.js";
import { generateTraceId } from "../../shared/trace.js";
import { IStorageService } from "../../shared/types.js";
import { createCharacterSchema } from "./schemas/character.schema.js";
import { withSignedGalleryImageUrls, withSignedImageUrls, withSignedImageUrlsBatch } from "./presenters/character.presenter.js";

const CHARACTER_IMAGE_BUCKET = "characters";

interface ResolvedUiCopy {
  copyKey: string;
  text: string;
  pageKey: string;
  sortOrder: number;
  source: "variant" | "character";
}

type SignedCharacterPayloadSource = Pick<
  Character,
  | "id"
  | "name"
  | "publicSlug"
  | "role"
  | "biography"
  | "description"
  | "keyTraits"
  | "speechTics"
  | "vectorDbName"
  | "voiceId"
  | "themeColor"
  | "themeColorLight"
  | "years"
  | "category"
  | "epoch"
  | "quote"
  | "ambientLabel"
  | "contentVariant"
  | "badge"
  | "topics"
  | "createdAt"
  | "userId"
  | "isPublic"
> & {
  imageUrl: string | null;
  backgroundImageUrl: string | null;
};

type SignedGalleryImagePayloadSource = Pick<
  CharacterGalleryImage,
  | "id"
  | "alt"
  | "caption"
  | "credit"
  | "sourceUrl"
  | "sortOrder"
  | "isCover"
> & {
  imageUrl: string | null;
};

export class CharacterController {
  private characterRepo = AppDataSource.getRepository(Character);
  private conversationRepo = AppDataSource.getRepository(Conversation);
  private messageRepo = AppDataSource.getRepository(Message);
  private quoteRepo = AppDataSource.getRepository(CharacterQuote);
  private factRepo = AppDataSource.getRepository(CharacterFact);
  private contextCardRepo = AppDataSource.getRepository(CharacterContextCard);
  private timelineEntryRepo = AppDataSource.getRepository(CharacterTimelineEntry);
  private relationshipRepo = AppDataSource.getRepository(CharacterRelationship);
  private promptRepo = AppDataSource.getRepository(CharacterPrompt);
  private galleryImageRepo = AppDataSource.getRepository(CharacterGalleryImage);
  private editorialBlockRepo = AppDataSource.getRepository(CharacterEditorialBlock);
  private copyOverrideRepo = AppDataSource.getRepository(CharacterCopyOverride);
  private contentVariantCopyRepo = AppDataSource.getRepository(ContentVariantCopy);

  constructor(private readonly storage: IStorageService) {}

  private getStoragePathCandidates(pathValue: string): string[] {
    const raw = pathValue.trim();
    const withoutLeadingSlash = raw.replace(/^\/+/, "");
    const withoutBucketPrefix = withoutLeadingSlash.startsWith(`${CHARACTER_IMAGE_BUCKET}/`)
      ? withoutLeadingSlash.slice(CHARACTER_IMAGE_BUCKET.length + 1)
      : withoutLeadingSlash;

    return [...new Set([raw, withoutLeadingSlash, withoutBucketPrefix].filter(Boolean))];
  }

  private getCharacterAssetPaths(character: Character, galleryImages: CharacterGalleryImage[]): string[] {
    const assetPaths = [character.imageUrl, character.backgroundImageUrl, ...galleryImages.map((galleryImage) => galleryImage.imageUrl)]
      .filter((pathValue): pathValue is string => Boolean(pathValue));

    return [...new Set(assetPaths.flatMap((pathValue) => this.getStoragePathCandidates(pathValue)))];
  }

  private getMessageAudioPaths(messages: Message[]): string[] {
    const values = messages.flatMap((message) => [message.audioStorageId, message.audioPath]);
    return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
  }

  private handleError(res: Response, context: string, error: unknown) {
    logger.error(`[character.${context}] failed`, serializeError(error));
    res.status(500).json({ error: "Internal Server Error" });
  }

  private compareBySortOrder<T extends { sortOrder: number }>(a: T, b: T) {
    return a.sortOrder - b.sortOrder;
  }

  private compareUiCopies(a: { pageKey: string; sortOrder: number; copyKey: string }, b: { pageKey: string; sortOrder: number; copyKey: string }) {
    const byPage = a.pageKey.localeCompare(b.pageKey);
    if (byPage !== 0) {
      return byPage;
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.copyKey.localeCompare(b.copyKey);
  }

  private resolveUiCopies(variantCopies: ContentVariantCopy[], copyOverrides: CharacterCopyOverride[]): ResolvedUiCopy[] {
    const resolvedByKey = new Map<string, ResolvedUiCopy>();

    for (const copy of [...variantCopies].sort((a, b) => this.compareUiCopies(a, b))) {
      resolvedByKey.set(copy.copyKey, {
        copyKey: copy.copyKey,
        text: copy.text,
        pageKey: copy.pageKey,
        sortOrder: copy.sortOrder,
        source: "variant",
      });
    }

    for (const override of [...copyOverrides].sort((a, b) => this.compareUiCopies(a, b))) {
      resolvedByKey.set(override.copyKey, {
        copyKey: override.copyKey,
        text: override.text,
        pageKey: override.pageKey,
        sortOrder: override.sortOrder,
        source: "character",
      });
    }

    return [...resolvedByKey.values()].sort((a, b) => this.compareUiCopies(a, b));
  }

  private mapTimelineEntries(timelineEntries: CharacterTimelineEntry[], relationships: CharacterRelationship[]) {
    const relationshipsById = new Map(relationships.map((relationship) => [relationship.id, relationship]));

    return [...timelineEntries]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((timelineEntry) => ({
        id: timelineEntry.id,
        yearLabel: timelineEntry.yearLabel,
        phaseLabel: timelineEntry.phaseLabel ?? null,
        title: timelineEntry.title,
        description: timelineEntry.description,
        narrativeText: timelineEntry.narrativeText ?? null,
        sortOrder: timelineEntry.sortOrder,
        relationships: [...timelineEntry.timelineRelationships]
          .map((timelineRelationship) => relationshipsById.get(timelineRelationship.relationshipId))
          .filter((relationship): relationship is CharacterRelationship => Boolean(relationship))
          .sort((a, b) => this.compareBySortOrder(a, b))
          .map((relationship) => ({
            id: relationship.id,
            name: relationship.name,
            role: relationship.role ?? null,
            dynamic: relationship.dynamic ?? null,
            sortOrder: relationship.sortOrder,
          })),
      }));
  }

  private mapEditorialBlocks(editorialBlocks: CharacterEditorialBlock[]) {
    return [...editorialBlocks]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((editorialBlock) => ({
        id: editorialBlock.id,
        blockKey: editorialBlock.blockKey,
        title: editorialBlock.title ?? null,
        body: editorialBlock.body,
        pageKey: editorialBlock.pageKey,
        sortOrder: editorialBlock.sortOrder,
      }));
  }

  private mapQuotes(quotes: CharacterQuote[]) {
    return [...quotes]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((quote) => ({
        id: quote.id,
        text: quote.text,
        attribution: quote.attribution ?? null,
        sortOrder: quote.sortOrder,
        isFeatured: quote.isFeatured,
      }));
  }

  private mapFacts(facts: CharacterFact[]) {
    return [...facts]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((fact) => ({
        id: fact.id,
        label: fact.label,
        value: fact.value,
        sectionKey: fact.sectionKey,
        sortOrder: fact.sortOrder,
      }));
  }

  private mapContextCards(contextCards: CharacterContextCard[]) {
    return [...contextCards]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((contextCard) => ({
        id: contextCard.id,
        eyebrow: contextCard.eyebrow ?? null,
        title: contextCard.title,
        body: contextCard.body,
        iconKey: contextCard.iconKey ?? null,
        pageKey: contextCard.pageKey,
        sortOrder: contextCard.sortOrder,
      }));
  }

  private mapRelationships(relationships: CharacterRelationship[]) {
    return [...relationships]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((relationship) => ({
        id: relationship.id,
        name: relationship.name,
        role: relationship.role ?? null,
        dynamic: relationship.dynamic ?? null,
        sortOrder: relationship.sortOrder,
      }));
  }

  private mapPrompts(prompts: CharacterPrompt[]) {
    return [...prompts]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((prompt) => ({
        id: prompt.id,
        label: prompt.label ?? null,
        prompt: prompt.prompt,
        note: prompt.note ?? null,
        ctaLabel: prompt.ctaLabel ?? null,
        sortOrder: prompt.sortOrder,
      }));
  }

  private mapGalleryImages(galleryImages: SignedGalleryImagePayloadSource[]) {
    return [...galleryImages]
      .sort((a, b) => this.compareBySortOrder(a, b))
      .map((galleryImage) => ({
        id: galleryImage.id,
        imageUrl: galleryImage.imageUrl,
        alt: galleryImage.alt ?? null,
        caption: galleryImage.caption ?? null,
        credit: galleryImage.credit ?? null,
        sourceUrl: galleryImage.sourceUrl ?? null,
        sortOrder: galleryImage.sortOrder,
        isCover: galleryImage.isCover,
      }));
  }

  private filterUiCopies(uiCopies: ResolvedUiCopy[], pageKeys: string[]) {
    const allowedPageKeys = new Set(pageKeys);
    return uiCopies.filter((copy) => allowedPageKeys.has(copy.pageKey));
  }

  private buildCharacterPayload(character: SignedCharacterPayloadSource) {
    return {
      id: character.id,
      name: character.name,
      publicSlug: character.publicSlug,
      role: character.role,
      biography: character.biography,
      description: character.description ?? null,
      keyTraits: character.keyTraits,
      speechTics: character.speechTics,
      vectorDbName: character.vectorDbName,
      voiceId: character.voiceId ?? null,
      themeColor: character.themeColor ?? null,
      themeColorLight: character.themeColorLight ?? null,
      years: character.years ?? null,
      category: character.category ?? null,
      epoch: character.epoch ?? null,
      quote: character.quote ?? null,
      imageUrl: character.imageUrl,
      backgroundImageUrl: character.backgroundImageUrl,
      ambientLabel: character.ambientLabel ?? null,
      contentVariant: character.contentVariant ?? null,
      badge: character.badge ?? null,
      topics: character.topics,
      createdAt: character.createdAt,
      userId: character.userId ?? null,
      isPublic: character.isPublic,
    };
  }

  private async findAccessibleCharacter(id: string, userId?: string) {
    return this.characterRepo.findOne({
      where: userId
        ? [{ id: id as any, isPublic: true }, { id: id as any, isPublic: false, userId }]
        : { id: id as any, isPublic: true },
    });
  }

  private async findAccessibleCharacterBySlug(publicSlug: string, userId?: string) {
    return this.characterRepo.findOne({
      where: userId
        ? [{ publicSlug, isPublic: true }, { publicSlug, isPublic: false, userId }]
        : { publicSlug, isPublic: true },
    });
  }

  private getCharacterIdParam(req: Request) {
    return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  }

  private getCharacterSlugParam(req: Request) {
    return Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  }

  private async getNextAvailablePublicSlug(baseSlug: string) {
    let sequence = 1;

    while (true) {
      const candidate = createSuffixedCharacterSlug(baseSlug, sequence);
      const existingCharacter = await this.characterRepo.findOne({ where: { publicSlug: candidate } });

      if (!existingCharacter) {
        return candidate;
      }

      sequence += 1;
    }
  }

  private async resolvePublicSlug(name: string, requestedPublicSlug?: string) {
    if (requestedPublicSlug) {
      const normalizedRequestedPublicSlug = normalizeCharacterSlug(requestedPublicSlug);

      if (!normalizedRequestedPublicSlug) {
        return { error: "El campo 'publicSlug' debe contener al menos un caracter valido" } as const;
      }

      const existingCharacter = await this.characterRepo.findOne({ where: { publicSlug: normalizedRequestedPublicSlug } });

      if (existingCharacter) {
        return { error: "El slug publico ya existe" } as const;
      }

      return { publicSlug: normalizedRequestedPublicSlug } as const;
    }

    const baseSlug = getCharacterSlugBase(name);
    const publicSlug = await this.getNextAvailablePublicSlug(baseSlug);

    return { publicSlug } as const;
  }

  private async getResolvedUiCopiesForCharacter(character: Character) {
    const [copyOverrides, variantCopies] = await Promise.all([
      this.copyOverrideRepo.find({
        where: { characterId: character.id },
        order: { pageKey: "ASC", sortOrder: "ASC" },
      }),
      character.contentVariant
        ? this.contentVariantCopyRepo.find({
            where: { contentVariant: character.contentVariant },
            order: { pageKey: "ASC", sortOrder: "ASC", copyKey: "ASC" },
          })
        : Promise.resolve([]),
    ]);

    return this.resolveUiCopies(variantCopies, copyOverrides);
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
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const result = await withSignedImageUrls(this.storage, character, env.SIGNED_URL_EXPIRES_SECONDS);
      res.json(result);
    } catch (error) {
      this.handleError(res, "getById", error);
    }
  }

  async getBySlug(req: Request, res: Response) {
    try {
      const slug = this.getCharacterSlugParam(req);
      const normalizedSlug = normalizeCharacterSlug(slug ?? "");

      if (!normalizedSlug) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacterBySlug(normalizedSlug, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const result = await withSignedImageUrls(this.storage, character, env.SIGNED_URL_EXPIRES_SECONDS);
      return res.json(result);
    } catch (error) {
      this.handleError(res, "getBySlug", error);
    }
  }

  async getEditorialById(req: Request, res: Response) {
    try {
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [quotes, facts, contextCards, timelineEntries, relationships, prompts, signedGalleryImages, editorialBlocks, signedCharacter, uiCopies] = await Promise.all([
        this.quoteRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.factRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.contextCardRepo.find({ where: { characterId: character.id }, order: { pageKey: "ASC", sortOrder: "ASC" } }),
        this.timelineEntryRepo.find({
          where: { characterId: character.id },
          order: { sortOrder: "ASC" },
          relations: { timelineRelationships: true },
        }),
        this.relationshipRepo.find({
          where: { characterId: character.id },
          order: { sortOrder: "ASC" },
        }),
        this.promptRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.galleryImageRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }).then((galleryImages) =>
          withSignedGalleryImageUrls(this.storage, galleryImages, env.SIGNED_URL_EXPIRES_SECONDS),
        ),
        this.editorialBlockRepo.find({ where: { characterId: character.id }, order: { pageKey: "ASC", sortOrder: "ASC" } }),
        withSignedImageUrls(this.storage, character, env.SIGNED_URL_EXPIRES_SECONDS),
        this.getResolvedUiCopiesForCharacter(character),
      ]);

      return res.json({
        character: this.buildCharacterPayload(signedCharacter),
        editorial: {
          quotes: this.mapQuotes(quotes),
          facts: this.mapFacts(facts),
          contextCards: this.mapContextCards(contextCards),
          timelineEntries: this.mapTimelineEntries(timelineEntries, relationships),
          relationships: this.mapRelationships(relationships),
          prompts: this.mapPrompts(prompts),
          galleryImages: this.mapGalleryImages(signedGalleryImages),
          editorialBlocks: this.mapEditorialBlocks(editorialBlocks),
          uiCopies,
        },
      });
    } catch (error) {
      this.handleError(res, "getEditorialById", error);
    }
  }

  async getEditorialHeroById(req: Request, res: Response) {
    try {
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [signedCharacter, quotes, uiCopies] = await Promise.all([
        withSignedImageUrls(this.storage, character, env.SIGNED_URL_EXPIRES_SECONDS),
        this.quoteRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.getResolvedUiCopiesForCharacter(character),
      ]);

      return res.json({
        character: this.buildCharacterPayload(signedCharacter),
        editorial: {
          quotes: this.mapQuotes(quotes),
          uiCopies: this.filterUiCopies(uiCopies, ["layout"]),
        },
      });
    } catch (error) {
      this.handleError(res, "getEditorialHeroById", error);
    }
  }

  async getEditorialOverviewById(req: Request, res: Response) {
    try {
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [facts, contextCards, editorialBlocks, uiCopies] = await Promise.all([
        this.factRepo.find({ where: { characterId: character.id, sectionKey: "quick_facts" }, order: { sortOrder: "ASC" } }),
        this.contextCardRepo.find({ where: { characterId: character.id, pageKey: "overview" }, order: { sortOrder: "ASC" } }),
        this.editorialBlockRepo.find({ where: { characterId: character.id, pageKey: "overview" }, order: { sortOrder: "ASC" } }),
        this.getResolvedUiCopiesForCharacter(character),
      ]);

      return res.json({
        editorial: {
          facts: this.mapFacts(facts),
          contextCards: this.mapContextCards(contextCards),
          editorialBlocks: this.mapEditorialBlocks(editorialBlocks),
          uiCopies: this.filterUiCopies(uiCopies, ["overview"]),
        },
      });
    } catch (error) {
      this.handleError(res, "getEditorialOverviewById", error);
    }
  }

  async getEditorialTimelineById(req: Request, res: Response) {
    try {
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [timelineEntries, relationships, uiCopies] = await Promise.all([
        this.timelineEntryRepo.find({
          where: { characterId: character.id },
          order: { sortOrder: "ASC" },
          relations: { timelineRelationships: true },
        }),
        this.relationshipRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.getResolvedUiCopiesForCharacter(character),
      ]);

      return res.json({
        editorial: {
          timelineEntries: this.mapTimelineEntries(timelineEntries, relationships),
          uiCopies: this.filterUiCopies(uiCopies, ["timeline"]),
        },
      });
    } catch (error) {
      this.handleError(res, "getEditorialTimelineById", error);
    }
  }

  async getEditorialRelationsById(req: Request, res: Response) {
    try {
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [contextCards, editorialBlocks, relationships, prompts, uiCopies] = await Promise.all([
        this.contextCardRepo.find({ where: { characterId: character.id, pageKey: "conversation" }, order: { sortOrder: "ASC" } }),
        this.editorialBlockRepo.find({ where: { characterId: character.id, pageKey: "conversation" }, order: { sortOrder: "ASC" } }),
        this.relationshipRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.promptRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }),
        this.getResolvedUiCopiesForCharacter(character),
      ]);

      return res.json({
        editorial: {
          contextCards: this.mapContextCards(contextCards),
          editorialBlocks: this.mapEditorialBlocks(editorialBlocks),
          relationships: this.mapRelationships(relationships),
          prompts: this.mapPrompts(prompts),
          uiCopies: this.filterUiCopies(uiCopies, ["relations"]),
        },
      });
    } catch (error) {
      this.handleError(res, "getEditorialRelationsById", error);
    }
  }

  async getEditorialGalleryById(req: Request, res: Response) {
    try {
      const id = this.getCharacterIdParam(req);
      const userId = extractUserId(req);
      const character = await this.findAccessibleCharacter(id, userId);

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [galleryImages, uiCopies] = await Promise.all([
        this.galleryImageRepo.find({ where: { characterId: character.id }, order: { sortOrder: "ASC" } }).then((results) =>
          withSignedGalleryImageUrls(this.storage, results, env.SIGNED_URL_EXPIRES_SECONDS),
        ),
        this.getResolvedUiCopiesForCharacter(character),
      ]);

      return res.json({
        editorial: {
          galleryImages: this.mapGalleryImages(galleryImages),
          uiCopies: this.filterUiCopies(uiCopies, ["gallery"]),
        },
      });
    } catch (error) {
      this.handleError(res, "getEditorialGalleryById", error);
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

      const resolvedPublicSlug = await this.resolvePublicSlug(parsed.data.name, parsed.data.publicSlug);

      if ("error" in resolvedPublicSlug) {
        return res.status(409).json({ error: resolvedPublicSlug.error });
      }

      const character = this.characterRepo.create({
        ...parsed.data,
        publicSlug: resolvedPublicSlug.publicSlug,
        userId,
      });

      const savedCharacter = await this.characterRepo.save(character);
      const result = await withSignedImageUrls(this.storage, savedCharacter, env.SIGNED_URL_EXPIRES_SECONDS);
      return res.status(201).json(result);
    } catch (error) {
      this.handleError(res, "create", error);
    }
  }

  async destroy(req: Request, res: Response) {
    const traceId = generateTraceId();

    try {
      const characterId = this.getCharacterIdParam(req);
      const userId = extractUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const character = await this.characterRepo.findOne({
        where: [{ id: characterId as any, isPublic: true }, { id: characterId as any, isPublic: false, userId }],
      });

      if (!character) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      const [galleryImages, relatedConversations] = await Promise.all([
        this.galleryImageRepo.find({ where: { characterId: character.id } }),
        this.conversationRepo.find({
          where: [{ character: { id: character.id } }, { secondaryCharacter: { id: character.id } }],
        }),
      ]);

      const conversationIds = relatedConversations.map((conversation) => conversation.id);
      const messages = conversationIds.length > 0 ? await this.messageRepo.find({ where: conversationIds.map((conversationId) => ({ conversationId })) }) : [];

      const characterAssetPaths = this.getCharacterAssetPaths(character, galleryImages);
      const messageAudioPaths = this.getMessageAudioPaths(messages);

      if (characterAssetPaths.length > 0) {
        try {
          await this.storage.deleteFiles(CHARACTER_IMAGE_BUCKET, characterAssetPaths);
          logger.debug("[character.destroy] storage_cleanup_completed", {
            traceId,
            event: "delete_character",
            characterId: character.id,
            bucket: CHARACTER_IMAGE_BUCKET,
            deletedFiles: characterAssetPaths.length,
          });
        } catch (error) {
          logger.warn("[character.destroy] storage_cleanup_failed", {
            traceId,
            event: "delete_character",
            characterId: character.id,
            bucket: CHARACTER_IMAGE_BUCKET,
            storagePaths: characterAssetPaths,
            error: serializeError(error),
          });
        }
      }

      if (messageAudioPaths.length > 0) {
        try {
          await this.storage.deleteFiles(env.SUPABASE_STORAGE_BUCKET, messageAudioPaths);
          logger.debug("[character.destroy] audio_cleanup_completed", {
            traceId,
            event: "delete_character",
            characterId: character.id,
            bucket: env.SUPABASE_STORAGE_BUCKET,
            deletedFiles: messageAudioPaths.length,
          });
        } catch (error) {
          logger.warn("[character.destroy] audio_cleanup_failed", {
            traceId,
            event: "delete_character",
            characterId: character.id,
            bucket: env.SUPABASE_STORAGE_BUCKET,
            storagePaths: messageAudioPaths,
            error: serializeError(error),
          });
        }
      }

      const result = await this.characterRepo.delete({ id: character.id });

      if (result.affected === 0) {
        return res.status(404).json({ error: "Personaje no encontrado" });
      }

      return res.status(204).send();
    } catch (error) {
      this.handleError(res, "destroy", error);
    }
  }
}
