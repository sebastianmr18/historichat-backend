import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn, Index, Relation } from "typeorm";
import { Conversation } from "./Conversation.js";
import { Profile } from "./Profile.js";

@Entity({ name: "app_character", schema: "public" })
@Index("idx_app_character_user_id", ["userId"])
@Index("idx_app_character_is_public", ["isPublic"])
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

  @Column({ type: "varchar", length: 50, name: "voice_id", nullable: true })
  voiceId?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @OneToMany(() => Conversation, (conversation) => conversation.character)
  conversations: Relation<Conversation[]>;

  @ManyToOne(() => Profile, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "app_character_user_id_fkey" })
  owner?: Relation<Profile>;

  @Column("uuid", { name: "user_id", nullable: true })
  userId?: string;

  @Column({ type: "boolean", name: "is_public", default: false })
  isPublic: boolean;
}