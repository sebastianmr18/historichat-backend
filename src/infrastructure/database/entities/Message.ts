import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Relation } from "typeorm";
import { Conversation } from "./Conversation.js";

@Entity("app_message")
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 10 })
  role: string;

  @Column({ type: "text" })
  content: string;

  @CreateDateColumn({ name: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;

  @Column({ type: "uuid", name: "conversation_id" })
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Relation<Conversation>;

    @Column({ type: "text", name: "audio_path", nullable: true })
  audioPath?: string | null;

  @Column({ type: "text", name: "audio_storage_id", nullable: true })
  audioStorageId?: string | null;

  @Column({ type: "text", name: "media_type", nullable: true })
  mediaType?: string | null;

  @Column({ type: "integer", name: "duration_ms", nullable: true })
  durationMs?: number | null;
}