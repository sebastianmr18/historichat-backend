import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity({ name: "app_profile", schema: "public" })
export class Profile {
  @PrimaryColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: true })
  username?: string;

  @Column({ type: "timestamptz", name: "created_at", nullable: true, default: () => "now()" })
  createdAt?: Date;
}