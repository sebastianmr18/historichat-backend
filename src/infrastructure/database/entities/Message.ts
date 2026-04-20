import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Relation } from "typeorm";
import { Conversation } from "./Conversation.js";
import { Character } from "./Character.js";

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

  @ManyToOne(() => Character, { nullable: true })
  @JoinColumn({ name: "speaker_character_id", foreignKeyConstraintName: "fk_app_message_speaker_character" })
  speakerCharacter?: Relation<Character> | null;

  @Column({ type: "uuid", name: "speaker_character_id", nullable: true })
  speakerCharacterId?: string | null;

  @Column({ type: "text", name: "audio_path", nullable: true })
  audioPath?: string | null;

  @Column({ type: "text", name: "audio_storage_id", nullable: true })
  audioStorageId?: string | null;

  @Column({ type: "text", name: "media_type", nullable: true })
  mediaType?: string | null;

  @Column({ type: "integer", name: "duration_ms", nullable: true })
  durationMs?: number | null;

  @Column({ type: "varchar", length: 20, name: "event_type", nullable: true })
  eventType?: string | null;

  @Column({ type: "jsonb", name: "event_meta_json", nullable: true })
  eventMetaJson?: Record<string, unknown> | null;
}