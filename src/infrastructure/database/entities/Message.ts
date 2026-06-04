/**
 * @file Message.ts
 * @description Entidad de base de datos para los Mensajes del chat.
 * Modela el rol (usuario o asistente), contenido textual, marcas de tiempo,
 * orador asociado (personaje), metadatos de audio y eventos estructurados del chat.
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Relation } from "typeorm";
import { Conversation } from "./Conversation.js";
import { Character } from "./Character.js";

/**
 * Entidad que representa un mensaje individual enviado o recibido dentro de una conversacion.
 */
@Entity("app_message")
export class Message {
  /** Identificador correlativo unico del mensaje (entero). */
  @PrimaryGeneratedColumn()
  id: number;

  /** Rol del emisor del mensaje ("user", "assistant" o "system"). */
  @Column({ type: "varchar", length: 10 })
  role: string;

  /** Contenido textual del mensaje. */
  @Column({ type: "text" })
  content: string;

  /** Fecha y hora exacta en que se registro el mensaje en el sistema. */
  @CreateDateColumn({ name: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  timestamp: Date;

  /** Identificador de la conversacion asociada. */
  @Column({ type: "uuid", name: "conversation_id" })
  conversationId: string;

  /** Relacion hacia el objeto de conversacion al que pertenece este mensaje. */
  @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversation_id" })
  conversation: Relation<Conversation>;

  /** Relacion hacia el personaje de IA que emitio el mensaje (null si es enviado por el usuario). */
  @ManyToOne(() => Character, { nullable: true })
  @JoinColumn({ name: "speaker_character_id", foreignKeyConstraintName: "fk_app_message_speaker_character" })
  speakerCharacter?: Relation<Character> | null;

  /** Identificador unico del personaje emisor (opcional). */
  @Column({ type: "uuid", name: "speaker_character_id", nullable: true })
  speakerCharacterId?: string | null;

  /** Ruta relativa del archivo de voz sintetizado almacenado en storage (opcional). */
  @Column({ type: "text", name: "audio_path", nullable: true })
  audioPath?: string | null;

  /** Identificador unico de almacenamiento del archivo de audio (opcional). */
  @Column({ type: "text", name: "audio_storage_id", nullable: true })
  audioStorageId?: string | null;

  /** Tipo MIME del archivo de voz generado (ej. "audio/mp3"). */
  @Column({ type: "text", name: "media_type", nullable: true })
  mediaType?: string | null;

  /** Duracion en milisegundos de la grabacion de voz (opcional). */
  @Column({ type: "integer", name: "duration_ms", nullable: true })
  durationMs?: number | null;

  /** Tipo de evento del mensaje en caso de ser un mensaje de sistema o control (opcional). */
  @Column({ type: "varchar", length: 20, name: "event_type", nullable: true })
  eventType?: string | null;

  /** Metadatos estructurados JSON de evento adicionales (opcional). */
  @Column({ type: "jsonb", name: "event_meta_json", nullable: true })
  eventMetaJson?: Record<string, unknown> | null;
}