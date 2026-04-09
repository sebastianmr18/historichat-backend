import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index, OneToMany, Relation } from "typeorm";
import { Character } from "./Character.js";
import { CharacterTimelineRelationship } from "./CharacterTimelineRelationship.js";

@Entity({ name: "app_character_timeline_entry", schema: "public" })
@Index("idx_app_character_timeline_entry_character_id", ["characterId"])
export class CharacterTimelineEntry {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid", { name: "character_id" })
  characterId: string;

  @ManyToOne(() => Character, (character) => character.timelineEntries, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "fk_app_character_timeline_entry_character" })
  character: Relation<Character>;

  @Column({ type: "varchar", length: 20, name: "year_label" })
  yearLabel: string;

  @Column({ type: "varchar", length: 80, name: "phase_label", nullable: true })
  phaseLabel?: string | null;

  @Column({ type: "varchar", length: 150 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "text", name: "narrative_text", nullable: true })
  narrativeText?: string | null;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;

  @OneToMany(() => CharacterTimelineRelationship, (timelineRelationship) => timelineRelationship.timelineEntry)
  timelineRelationships: Relation<CharacterTimelineRelationship[]>;
}