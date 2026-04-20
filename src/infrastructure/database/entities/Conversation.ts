import { randomUUID } from "crypto";
import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Column, Index, Relation, BeforeInsert } from "typeorm";
import { Character } from "./Character.js";
import { Message } from "./Message.js";
import { Profile } from "./Profile.js";

@Entity({ name: "app_conversation", schema: "public" })
@Index("idx_app_conversation_user_id", ["userId"])
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => Character, (character) => character.conversations)
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "app_conversation_character_id_b42f2e73_fk_app_character_id" })
  character: Relation<Character>;

  @ManyToOne(() => Character, { nullable: true })
  @JoinColumn({ name: "secondary_character_id", foreignKeyConstraintName: "fk_app_conversation_secondary_character" })
  secondaryCharacter?: Relation<Character> | null;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<Message[]>;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "fk_app_conversation_user" })
  user: Relation<Profile>;

  @Column("uuid", { name: "user_id" })
  userId: string;

  @Column("uuid", { name: "secondary_character_id", nullable: true })
  secondaryCharacterId?: string | null;

  @Column("varchar", {
    name: "debate_turn_mode",
    length: 20,
    default: "auto_alternate",
  })
  debateTurnMode?: "auto_alternate" | "manual";

  @Column("uuid", { name: "preferred_opening_speaker_id", nullable: true })
  preferredOpeningSpeakerId?: string | null;

  @Column("uuid", { name: "next_speaker_id", nullable: true })
  nextSpeakerId?: string | null;

  @Column("uuid", { name: "last_forced_speaker_id", nullable: true })
  lastForcedSpeakerId?: string | null;

  @Column("jsonb", { name: "debate_settings", nullable: true })
  debateSettings?: Record<string, unknown> | null;

  @BeforeInsert()
  assignDefaultsBeforeInsert() {
    if (!this.id) {
      this.id = randomUUID();
    }

    if (!this.createdAt) {
      this.createdAt = new Date();
    }
  }
}