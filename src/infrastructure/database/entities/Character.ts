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

@Entity({ name: "app_character", schema: "public" })
@Index("idx_app_character_user_id", ["userId"])
@Index("idx_app_character_is_public", ["isPublic"])
export class Character {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Index("idx_app_character_public_slug", { unique: true })
  @Column({ type: "text", name: "public_slug" })
  publicSlug: string;

  @Column({ type: "varchar", length: 100 })
  role: string;

  @Column({ type: "text" })
  biography: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "jsonb", name: "key_traits", default: [] })
  keyTraits: string[];

  @Column({ type: "jsonb", name: "speech_tics", default: [] })
  speechTics: string[];

  @Column({ type: "varchar", length: 150, name: "vector_db_name", default: "" })
  vectorDbName: string;

  @Column({ type: "varchar", length: 50, name: "voice_id", nullable: true })
  voiceId?: string;

  @Column({ type: "text", name: "theme_color", nullable: true })
  themeColor?: string;

  @Column({ type: "text", name: "theme_color_light", nullable: true })
  themeColorLight?: string;

  @Column({ type: "text", name: "years", nullable: true })
  years?: string;

  @Column({ type: "text", name: "category", nullable: true })
  category?: string;

  @Column({ type: "text", name: "epoch", nullable: true })
  epoch?: string;

  @Column({ type: "text", name: "quote", nullable: true })
  quote?: string;

  @Column({ type: "text", name: "image_url", nullable: true })
  imageUrl?: string;

  @Column({ type: "text", name: "background_image_url", nullable: true })
  backgroundImageUrl?: string;

  @Column({ type: "text", name: "ambient_label", nullable: true })
  ambientLabel?: string;

  @Column({ type: "varchar", length: 50, name: "content_variant", nullable: true })
  contentVariant?: string;

  @Column({ type: "varchar", length: 10, name: "badge", nullable: true })
  badge?: "popular" | "new";

  @Column({ type: "jsonb", name: "topics", default: [] })
  topics: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToMany(() => Conversation, (conversation) => conversation.character)
  conversations: Relation<Conversation[]>;

  @OneToMany(() => CharacterQuote, (quote) => quote.character)
  quotes: Relation<CharacterQuote[]>;

  @OneToMany(() => CharacterFact, (fact) => fact.character)
  facts: Relation<CharacterFact[]>;

  @OneToMany(() => CharacterContextCard, (contextCard) => contextCard.character)
  contextCards: Relation<CharacterContextCard[]>;

  @OneToMany(() => CharacterTimelineEntry, (timelineEntry) => timelineEntry.character)
  timelineEntries: Relation<CharacterTimelineEntry[]>;

  @OneToMany(() => CharacterRelationship, (relationship) => relationship.character)
  relationships: Relation<CharacterRelationship[]>;

  @OneToMany(() => CharacterPrompt, (prompt) => prompt.character)
  prompts: Relation<CharacterPrompt[]>;

  @OneToMany(() => CharacterGalleryImage, (galleryImage) => galleryImage.character)
  galleryImages: Relation<CharacterGalleryImage[]>;

  @OneToMany(() => CharacterEditorialBlock, (editorialBlock) => editorialBlock.character)
  editorialBlocks: Relation<CharacterEditorialBlock[]>;

  @OneToMany(() => CharacterCopyOverride, (copyOverride) => copyOverride.character)
  copyOverrides: Relation<CharacterCopyOverride[]>;

  @ManyToOne(() => Profile, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "app_character_user_id_fkey" })
  owner?: Relation<Profile>;

  @Column("uuid", { name: "user_id", nullable: true })
  userId?: string;

  @Column({ type: "boolean", name: "is_public", default: false })
  isPublic: boolean;

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