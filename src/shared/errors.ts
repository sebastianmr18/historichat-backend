/**
 * @file errors.ts
 * @description Utilidades de ayuda para la manipulación, estructuración y serialización de errores del sistema.
 */

/**
 * Serializa un objeto de error desconocido en una estructura JSON plana y segura.
 * Extrae propiedades estándar como nombre, mensaje y traza de pila (stack trace) si es una instancia de Error.
 * 
 * @param error - Instancia de error u objeto desconocido a serializar.
 * @returns Objeto serializado con el mensaje, el nombre y el stack trace (si aplica).
 */
export function serializeError(error: unknown): { name?: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
