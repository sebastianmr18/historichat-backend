import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, OneToMany, Relation } from "typeorm";
import { Character } from "./Character.js";
import { CharacterTimelineRelationship } from "./CharacterTimelineRelationship.js";

@Entity({ name: "app_character_relationship", schema: "public" })
@Index("idx_app_character_relationship_character_id", ["characterId"])
export class CharacterRelationship {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.relationships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_relationship_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 120 })
  name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  role?: string | null;

  @Column({ type: "text", nullable: true })
  dynamic?: string | null;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;

  @OneToMany(() => CharacterTimelineRelationship, (timelineRelationship) => timelineRelationship.relationship)
  timelineRelationships: Relation<CharacterTimelineRelationship[]>;
}