import { Entity, PrimaryColumn, Column } from "typeorm";
import { UserRole } from "../../../domain/auth/user-role.js";

@Entity({ name: "app_profile", schema: "public" })
export class Profile {
  @PrimaryColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: true })
  username?: string;

  @Column({ type: "varchar", length: 20, default: "user" })
  role: UserRole;

  @Column({ type: "timestamptz", name: "created_at", nullable: true, default: () => "now()" })
  createdAt?: Date;
}