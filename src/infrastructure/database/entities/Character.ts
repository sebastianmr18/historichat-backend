import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { Conversation } from "./Conversation.js";

@Entity("app_character")
export class Character {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 100 })
  role: string;

  @Column({ type: "text" })
  biography: string;

  @Column({ type: "jsonb", name: "key_traits", default: [] })
  keyTraits: string[];

  @Column({ type: "jsonb", name: "speech_tics", default: [] })
  speechTics: string[];

  @Column({ type: "varchar", length: 150, name: "vector_db_name", default: "" })
  vectorDbName: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToMany(() => Conversation, (conversation) => conversation.character)
  conversations: Conversation[];
}