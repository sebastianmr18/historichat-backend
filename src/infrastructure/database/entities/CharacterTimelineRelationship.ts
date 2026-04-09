import { Entity, ManyToOne, JoinColumn, Column, PrimaryColumn, Index, Relation } from "typeorm";
import { CharacterRelationship } from "./CharacterRelationship.js";
import { CharacterTimelineEntry } from "./CharacterTimelineEntry.js";

@Entity({ name: "app_character_timeline_relationship", schema: "public" })
@Index("idx_app_character_timeline_relationship_relationship_id", ["relationshipId"])
export class CharacterTimelineRelationship {
  @PrimaryColumn("uuid", { name: "timeline_entry_id" })
  timelineEntryId: string;

  @PrimaryColumn("uuid", { name: "relationship_id" })
  relationshipId: string;

  @ManyToOne(() => CharacterTimelineEntry, (timelineEntry) => timelineEntry.timelineRelationships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "timeline_entry_id", foreignKeyConstraintName: "fk_app_character_timeline_relationship_entry" })
  timelineEntry: Relation<CharacterTimelineEntry>;

  @ManyToOne(() => CharacterRelationship, (relationship) => relationship.timelineRelationships, { onDelete: "CASCADE" })
  @JoinColumn({ name: "relationship_id", foreignKeyConstraintName: "fk_app_character_timeline_relationship_relationship" })
  relationship: Relation<CharacterRelationship>;
}