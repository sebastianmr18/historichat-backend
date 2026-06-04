/**
 * @file CharacterEditorialBlock.ts
 * @description Entidad de base de datos para bloques editoriales personalizados de un personaje.
 */
import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_editorial_block", schema: "public" })
@Index("idx_app_character_editorial_block_character_id", ["characterId"])
@Index("idx_app_character_editorial_block_character_page_sort", ["characterId", "pageKey", "sortOrder"])
export class CharacterEditorialBlock {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.editorialBlocks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_editorial_block_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 80, name: "block_key" })
  blockKey: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  title?: string | null;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "varchar", length: 40, name: "page_key" })
  pageKey: string;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;
}