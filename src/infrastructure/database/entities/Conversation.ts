/**
 * @file Conversation.ts
 * @description Entidad de base de datos para las Conversaciones del chat.
 * Almacena el personaje principal, personaje secundario (para debates),
 * configuraciones de turnos del debate y relaciones con el perfil del usuario y los mensajes.
 */

import { randomUUID } from "crypto";
import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, OneToMany, JoinColumn, Column, Index, Relation, BeforeInsert } from "typeorm";
import { Character } from "./Character.js";
import { Message } from "./Message.js";
import { Profile } from "./Profile.js";

/**
 * Entidad que modela una sesion de conversacion activa entre un usuario y uno o mas personajes de IA.
 */
@Entity({ name: "app_conversation", schema: "public" })
@Index("idx_app_conversation_user_id", ["userId"])
export class Conversation {
  /** Identificador unico de la conversacion (UUID). */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /** Fecha y hora de creacion de la conversacion. */
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /** Relacion con el personaje principal de la conversacion. */
  @ManyToOne(() => Character, (character) => character.conversations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "character_id", foreignKeyConstraintName: "app_conversation_character_id_b42f2e73_fk_app_character_id" })
  character: Relation<Character>;

  /** Relacion con el personaje contrincante secundario si se trata de un debate (opcional). */
  @ManyToOne(() => Character, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "secondary_character_id", foreignKeyConstraintName: "fk_app_conversation_secondary_character" })
  secondaryCharacter?: Relation<Character> | null;

  /** Listado de mensajes historicos asociados a esta conversacion. */
  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<Message[]>;

  /** Relacion con el perfil del usuario propietario de la conversacion. */
  @ManyToOne(() => Profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "fk_app_conversation_user" })
  user: Relation<Profile>;

  /** Identificador del usuario propietario. */
  @Column("uuid", { name: "user_id" })
  userId: string;

  /** Identificador del personaje secundario (opcional). */
  @Column("uuid", { name: "secondary_character_id", nullable: true })
  secondaryCharacterId?: string | null;

  /** Modo de seleccion del turno en debates ("auto_alternate" para alternancia automatica o "manual"). */
  @Column("varchar", {
    name: "debate_turn_mode",
    length: 20,
    default: "auto_alternate",
  })
  debateTurnMode?: "auto_alternate" | "manual";

  /** Identificador del orador preferido para iniciar el debate. */
  @Column("uuid", { name: "preferred_opening_speaker_id", nullable: true })
  preferredOpeningSpeakerId?: string | null;

  /** Identificador del personaje que tomara el proximo turno. */
  @Column("uuid", { name: "next_speaker_id", nullable: true })
  nextSpeakerId?: string | null;

  /** Identificador del ultimo orador forzado por el moderador. */
  @Column("uuid", { name: "last_forced_speaker_id", nullable: true })
  lastForcedSpeakerId?: string | null;

  /** Opciones de configuracion y variables extras especificas del debate. */
  @Column("jsonb", { name: "debate_settings", nullable: true })
  debateSettings?: Record<string, unknown> | null;

  /**
   * Genera de forma automatica el ID unico (UUID) y la fecha de creacion si no estan presentes.
   */
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