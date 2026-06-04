/**
 * @file user-role.ts
 * @description Definición de roles de usuario permitidos dentro del sistema y funciones auxiliares para su validación.
 */

/**
 * Lista inmutable de roles de usuario admitidos por el sistema.
 */
export const USER_ROLES = ["user", "admin"] as const;

/**
 * Representa los roles de seguridad que un usuario autenticado puede poseer.
 */
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Comprobación de tipo (Type Guard) para determinar si un valor desconocido corresponde a un rol de usuario válido.
 * 
 * @param value - Valor a evaluar.
 * @returns Verdadero si el valor es de tipo UserRole, falso de lo contrario.
 */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}