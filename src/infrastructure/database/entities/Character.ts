/**
 * @file Character.ts
 * @description Entidad de base de datos para los Personajes de IA.
 * Modela los atributos narrativos (biografia, rasgos, tics), multimedia (imagenes, voz),
 * configuraciones visuales, relaciones con otras entidades de TypeORM y triggers de insercion.
 */

import { randomUUID } from "crypto";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn, Index, Relation, BeforeInsert } from "typeorm";
import { Conversation } from "./Conversation.js";
import { CharacterCopyOverride } from "./CharacterCopyOverride.js";
import { Profile } from "./Profile.js";
import { CharacterContextCard } from "./CharacterContextCard.js";
import { CharacterEditorialBlock } from "./CharacterEditorialBlock.js";
import { CharacterFact } from "./CharacterFact.js";
import { CharacterGalleryImage } from "./CharacterGalleryImage.js";
import { CharacterPrompt } from "./CharacterPrompt.js";
import { CharacterQuote } from "./CharacterQuote.js";
import { CharacterRelationship } from "./CharacterRelationship.js";
import { CharacterTimelineEntry } from "./CharacterTimelineEntry.js";

/**
 * Entidad de base de datos que representa a un personaje historico o ficticio controlado por IA.
 */
@Entity({ name: "app_character", schema: "public" })
@Index("idx_app_character_user_id", ["userId"])
@Index("idx_app_character_is_public", ["isPublic"])
export class Character {
  /** Identificador unico del personaje (UUID). */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Nombre publico del personaje. */
  @Column({ type: "varchar", length: 100 })
  name: string;

  /** Identificador amigable y unico utilizado en URLs. */
  @Index("idx_app_character_public_slug", { unique: true })
  @Column({ type: "text", name: "public_slug" })
  publicSlug: string;

  /** Rol, profesion o profesion del personaje (ej. "Filosofo"). */
  @Column({ type: "varchar", length: 100 })
  role: string;

  /** Biografia completa o descripcion de fondo del personaje. */
  @Column({ type: "text" })
  biography: string;

  /** Descripcion resumida de la personalidad o propositos. */
  @Column({ type: "text", nullable: true })
  description?: string;

  /** Listado de adjetivos o rasgos clave del personaje. */
  @Column({ type: "jsonb", name: "key_traits", default: [] })
  keyTraits: string[];

  /** Tics de lenguaje, muletillas o patrones de habla especificos. */
  @Column({ type: "jsonb", name: "speech_tics", default: [] })
  speechTics: string[];

  /** Nombre de la coleccion vectorial asignada en ChromaDB para el RAG. */
  @Column({ type: "varchar", length: 150, name: "vector_db_name", default: "" })
  vectorDbName: string;

  /** Identificador de la voz asignada en el motor TTS (ej. Google Cloud o Gemini). */
  @Column({ type: "varchar", length: 50, name: "voice_id", nullable: true })
  voiceId?: string;

  /** Color hexadecimal de tema primario oscuro. */
  @Column({ type: "text", name: "theme_color", nullable: true })
  themeColor?: string;

  /** Color hexadecimal de tema primario claro. */
  @Column({ type: "text", name: "theme_color_light", nullable: true })
  themeColorLight?: string;

  /** Anos de nacimiento y muerte (ej. "384 a.C. - 322 a.C."). */
  @Column({ type: "text", name: "years", nullable: true })
  years?: string;

  /** Categoria tematica general del personaje (ej. "Ciencia", "Filosofia"). */
  @Column({ type: "text", name: "category", nullable: true })
  category?: string;

  /** Epoca historica en que vivio (ej. "Antigua Grecia"). */
  @Column({ type: "text", name: "epoch", nullable: true })
  epoch?: string;

  /** Frase celebre principal del personaje para las vistas de presentacion. */
  @Column({ type: "text", name: "quote", nullable: true })
  quote?: string;

  /** URL del avatar o retrato principal del personaje. */
  @Column({ type: "text", name: "image_url", nullable: true })
  imageUrl?: string;

  /** URL de la imagen de fondo para la ficha del personaje. */
  @Column({ type: "text", name: "background_image_url", nullable: true })
  backgroundImageUrl?: string;

  /** Etiqueta decorativa o de ambiente en la interfaz. */
  @Column({ type: "text", name: "ambient_label", nullable: true })
  ambientLabel?: string;

  /** Variante de contenido o diseno asignada en la UI. */
  @Column({ type: "varchar", length: 50, name: "content_variant", nullable: true })
  contentVariant?: string;

  /** Insignia o etiqueta de clasificacion visual del personaje. */
  @Column({ type: "varchar", length: 10, name: "badge", nullable: true })
  badge?: "popular" | "new";

  /** Listado de temas clave que domina o sobre los que habla. */
  @Column({ type: "jsonb", name: "topics", default: [] })
  topics: string[];

  /** Fecha de registro o creacion del personaje. */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** Relacion con las conversaciones iniciadas con este personaje. */
  @OneToMany(() => Conversation, (conversation) => conversation.character)
  conversations: Relation<Conversation[]>;

  /** Relacion con las citas célebres extendidas del personaje. */
  @OneToMany(() => CharacterQuote, (quote) => quote.character)
  quotes: Relation<CharacterQuote[]>;

  /** Relacion con hechos o datos curiosos del personaje. */
  @OneToMany(() => CharacterFact, (fact) => fact.character)
  facts: Relation<CharacterFact[]>;

  /** Relacion con las tarjetas de contexto explicativas. */
  @OneToMany(() => CharacterContextCard, (contextCard) => contextCard.character)
  contextCards: Relation<CharacterContextCard[]>;

  /** Relacion con los eventos cronologicos de su biografia. */
  @OneToMany(() => CharacterTimelineEntry, (timelineEntry) => timelineEntry.character)
  timelineEntries: Relation<CharacterTimelineEntry[]>;

  /** Relacion con los vinculos hacia otros personajes. */
  @OneToMany(() => CharacterRelationship, (relationship) => relationship.character)
  relationships: Relation<CharacterRelationship[]>;

  /** Relacion con las configuraciones de prompts del sistema. */
  @OneToMany(() => CharacterPrompt, (prompt) => prompt.character)
  prompts: Relation<CharacterPrompt[]>;

  /** Relacion con la galeria de imagenes del personaje. */
  @OneToMany(() => CharacterGalleryImage, (galleryImage) => galleryImage.character)
  galleryImages: Relation<CharacterGalleryImage[]>;

  /** Relacion con los bloques editoriales en la interfaz del personaje. */
  @OneToMany(() => CharacterEditorialBlock, (editorialBlock) => editorialBlock.character)
  editorialBlocks: Relation<CharacterEditorialBlock[]>;

  /** Relacion con las traducciones o textos especificos sobreescritos. */
  @OneToMany(() => CharacterCopyOverride, (copyOverride) => copyOverride.character)
  copyOverrides: Relation<CharacterCopyOverride[]>;

  /** Relacion con el perfil de usuario creador del personaje (si no es publico global). */
  @ManyToOne(() => Profile, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "app_character_user_id_fkey" })
  owner?: Relation<Profile>;

  /** ID del creador del personaje. */
  @Column("uuid", { name: "user_id", nullable: true })
  userId?: string;

  /** Indica si el personaje esta disponible publicamente para todos los usuarios. */
  @Column({ type: "boolean", name: "is_public", default: false })
  isPublic: boolean;

  /**
   * Genera de forma automatica el ID unico (UUID) y la fecha de creacion si no estan presentes.
   */
  @BeforeInsert()
  assignDefaultsBeforeInsert() {
    if (!this.id) {
      this.id = randomUUID();
    }

    if (!this.createdAt) {
      this.createdAt = new Date();
    }
  }
}