/**
 * @file CharacterQuote.ts
 * @description Entidad de base de datos para las citas destacadas de un personaje.
 */
import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_quote", schema: "public" })
@Index("idx_app_character_quote_character_id", ["characterId"])
export class CharacterQuote {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.quotes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_quote_character" })
  character: Relation<Character>;

  @Column({ type: "text" })
  text: string;

  @Column({ type: "text", nullable: true })
  attribution?: string | null;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;

  @Column({ type: "boolean", name: "is_featured", default: false })
  isFeatured: boolean;
}