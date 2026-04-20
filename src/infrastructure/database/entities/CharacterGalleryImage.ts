import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_gallery_image", schema: "public" })
@Index("idx_app_character_gallery_image_character_id", ["characterId"])
export class CharacterGalleryImage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.galleryImages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_gallery_image_character" })
  character: Relation<Character>;

  @Column({ type: "text", name: "image_url" })
  imageUrl: string;

  @Column({ type: "text", nullable: true })
  alt?: string | null;

  @Column({ type: "text", nullable: true })
  caption?: string | null;

  @Column({ type: "text", nullable: true })
  credit?: string | null;

  @Column({ type: "text", name: "source_url", nullable: true })
  sourceUrl?: string | null;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;

  @Column({ type: "boolean", name: "is_cover", default: false })
  isCover: boolean;
}