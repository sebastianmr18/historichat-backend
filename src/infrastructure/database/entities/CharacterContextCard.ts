import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_context_card", schema: "public" })
@Index("idx_app_character_context_card_character_id", ["characterId"])
export class CharacterContextCard {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.contextCards, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_context_card_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 80, nullable: true })
  eyebrow?: string | null;

  @Column({ type: "varchar", length: 150 })
  title: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "varchar", length: 50, name: "icon_key", nullable: true })
  iconKey?: string | null;

  @Column({ type: "varchar", length: 40, name: "page_key" })
  pageKey: string;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;
}