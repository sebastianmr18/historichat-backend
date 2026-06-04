/**
 * @file CharacterFact.ts
 * @description Entidad de base de datos para los datos curiosos o hechos de un personaje.
 */
import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, Relation } from "typeorm";
import { Character } from "./Character.js";

@Entity({ name: "app_character_fact", schema: "public" })
@Index("idx_app_character_fact_character_id", ["characterId"])
export class CharacterFact {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.facts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_fact_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 80 })
  label: string;

  @Column({ type: "text" })
  value: string;

  @Column({ type: "varchar", length: 40, name: "section_key" })
  sectionKey: string;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;
}