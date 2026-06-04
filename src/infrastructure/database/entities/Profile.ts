/**
 * @file Profile.ts
 * @description Entidad de base de datos para los Perfiles de Usuario.
 * Modela el identificador UUID sincronizado con el proveedor de identidad,
 * el nombre de usuario, el rol en la plataforma (UserRole) y la fecha de creacion.
 */

import { Entity, PrimaryColumn, Column } from "typeorm";
import { UserRole } from "../../../domain/auth/user-role.js";

/**
 * Entidad que representa el perfil publico y permisos de un usuario registrado.
 */
@Entity({ name: "app_profile", schema: "public" })
export class Profile {
  /** Identificador unico del usuario sincronizado con el proveedor de autenticacion (UUID). */
  @PrimaryColumn("uuid")
  id: string;

  /** Nombre unico de usuario (opcional). */
  @Column({ type: "text", nullable: true })
  username?: string;

  /** Rol asignado al usuario para autorizacion (ej. "admin", "user"). */
  @Column({ type: "varchar", length: 20, default: "user" })
  role: UserRole;

  /** Fecha y hora de creacion del perfil en la base de datos. */
  @Column({ type: "timestamptz", name: "created_at", nullable: true, default: () => "now()" })
  createdAt?: Date;
}