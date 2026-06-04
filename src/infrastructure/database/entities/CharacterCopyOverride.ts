/**
 * @file CharacterCopyOverride.ts
 * @description Entidad de base de datos para la sobreescritura de copys (textos) de un personaje.
 */
import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_copy_override", schema: "public" })
@Index("idx_app_character_copy_override_character_id", ["characterId"])
@Index("idx_app_character_copy_override_character_page_sort", ["characterId", "pageKey", "sortOrder"])
export class CharacterCopyOverride {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.copyOverrides, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_copy_override_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 80, name: "copy_key" })
  copyKey: string;

  @Column({ type: "text" })
  text: string;

  @Column({ type: "varchar", length: 40, name: "page_key" })
  pageKey: string;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;
}