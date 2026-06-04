/**
 * @file user-prompt-builder.ts
 * @description Constructor de prompts de usuario finales para el backend.
 * Asegura la sanitizacion del input del usuario y del contexto RAG eliminando etiquetas XML estructurales
 * antes de empaquetar el mensaje final enviado al LLM.
 */

/**
 * Patron de expresion regular para detectar e interceptar etiquetas XML estructurales del sistema.
 */
const STRUCTURAL_TAG_PATTERN =
  /<\/?(system_identity|behavior_rules|retrieved_context|user_message)\s*>/gi;

/**
 * Elimina las etiquetas XML estructurales de un texto para evitar ataques de inyeccion
 * que intenten cerrar o abrir secciones de prompts de forma fraudulenta.
 *
 * @param text - Texto a limpiar.
 * @returns Texto sanitizado sin las etiquetas estructurales del sistema.
 */
function stripStructuralTags(text: string): string {
  STRUCTURAL_TAG_PATTERN.lastIndex = 0;
  return text.replace(STRUCTURAL_TAG_PATTERN, "");
}

/**
 * Construye el prompt final del usuario, envolviendo la consulta del usuario
 * y el contexto RAG opcional dentro de etiquetas XML estructurales de forma segura.
 *
 * @param userQuery - Consulta realizada por el usuario.
 * @param contextRAG - Fragmentos de texto recuperados de la base de conocimientos (opcional).
 * @returns Cadena con la estructura XML final lista para el LLM.
 */
export function buildFinalUserPrompt(userQuery: string, contextRAG?: string): string {
  const safeQuery = stripStructuralTags(userQuery);

  if (contextRAG?.trim()) {
    const safeRag = stripStructuralTags(contextRAG);
    return `<retrieved_context>\n${safeRag}\n</retrieved_context>\n\n<user_message>\n${safeQuery}\n</user_message>`;
  }

  return `<user_message>\n${safeQuery}\n</user_message>`;
}
