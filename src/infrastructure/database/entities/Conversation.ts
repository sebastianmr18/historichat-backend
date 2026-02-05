import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Column } from "typeorm";
import { Character } from "./Character.js";
import { Message } from "./Message.js";

@Entity("app_conversation")
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ManyToOne(() => Character, (character) => character.conversations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id" })
  character: Character;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}