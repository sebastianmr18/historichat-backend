import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_prompt", schema: "public" })
@Index("idx_app_character_prompt_character_id", ["characterId"])
export class CharacterPrompt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.prompts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_prompt_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 80, nullable: true })
  label?: string | null;

  @Column({ type: "text" })
  prompt: string;

  @Column({ type: "text", nullable: true })
  note?: string | null;

  @Column({ type: "varchar", length: 40, name: "cta_label", nullable: true })
  ctaLabel?: string | null;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;
}