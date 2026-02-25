import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Column, Index, Relation } from "typeorm";
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

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<Message[]>;

  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "fk_app_conversation_user" })
  user: Relation<Profile>;

  @Column("uuid", { name: "user_id" })
  userId: string;
}