/**
 * @file editorial.schema.ts
 * @description Esquemas de validacion Zod para recursos editoriales (citas, facts, timeline, etc.).
 */
import { z } from "zod";

export const createQuoteSchema = z.object({
  text: z.string().min(1, "El campo 'text' es obligatorio").max(2000),
  attribution: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
});

export const updateQuoteSchema = createQuoteSchema.partial();

export const createFactSchema = z.object({
  label: z.string().min(1, "El campo 'label' es obligatorio").max(80),
  value: z.string().min(1, "El campo 'value' es obligatorio"),
  sectionKey: z.string().min(1, "El campo 'sectionKey' es obligatorio").max(40),
  sortOrder: z.number().int().default(0),
});

export const updateFactSchema = createFactSchema.partial();

export const createPromptSchema = z.object({
  label: z.string().max(80).optional().nullable(),
  prompt: z.string().min(1, "El campo 'prompt' es obligatorio"),
  note: z.string().optional().nullable(),
  ctaLabel: z.string().max(40).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updatePromptSchema = createPromptSchema.partial();

export const createContextCardSchema = z.object({
  eyebrow: z.string().max(80).optional().nullable(),
  title: z.string().min(1, "El campo 'title' es obligatorio").max(150),
  body: z.string().min(1, "El campo 'body' es obligatorio"),
  iconKey: z.string().max(50).optional().nullable(),
  pageKey: z.string().min(1, "El campo 'pageKey' es obligatorio").max(40),
  sortOrder: z.number().int().default(0),
});

export const updateContextCardSchema = createContextCardSchema.partial();

export const createTimelineEntrySchema = z.object({
  yearLabel: z.string().min(1, "El campo 'yearLabel' es obligatorio").max(20),
  phaseLabel: z.string().max(80).optional().nullable(),
  title: z.string().min(1, "El campo 'title' es obligatorio").max(150),
  description: z.string().min(1, "El campo 'description' es obligatorio"),
  narrativeText: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updateTimelineEntrySchema = createTimelineEntrySchema.partial();

export const createRelationshipSchema = z.object({
  name: z.string().min(1, "El campo 'name' es obligatorio").max(120),
  role: z.string().max(120).optional().nullable(),
  dynamic: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const updateRelationshipSchema = createRelationshipSchema.partial();

export const createGalleryImageSchema = z.object({
  imageUrl: z.string().min(1, "El campo 'imageUrl' es obligatorio"),
  alt: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  credit: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isCover: z.boolean().default(false),
});

export const updateGalleryImageSchema = createGalleryImageSchema.partial();

export const createEditorialBlockSchema = z.object({
  blockKey: z.string().min(1, "El campo 'blockKey' es obligatorio").max(80),
  title: z.string().max(120).optional().nullable(),
  body: z.string().min(1, "El campo 'body' es obligatorio"),
  pageKey: z.string().min(1, "El campo 'pageKey' es obligatorio").max(40),
  sortOrder: z.number().int().default(0),
});

export const updateEditorialBlockSchema = createEditorialBlockSchema.partial();
