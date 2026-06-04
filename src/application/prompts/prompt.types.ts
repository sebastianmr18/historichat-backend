/**
 * @file prompt.types.ts
 * @description Definicion de los tipos de entrada para la construccion de prompts del sistema de chat.
 * Centraliza las estructuras de datos necesarias para generar instrucciones de sistema para cada modo de conversacion.
 */

import { Character } from "../../infrastructure/database/entities/Character.js";
import { Message } from "../../infrastructure/database/entities/Message.js";
import { PromptMode } from "../../shared/types.js";

/**
 * Resumen minimo de un personaje necesario para construir prompts de debate sin importar la entidad completa.
 */
export interface PromptCharacterSummary {
  /** Identificador unico del personaje. */
  id: string;
  /** Nombre del personaje. */
  name: string;
  /** Rol narrativo o historico del personaje (opcional). */
  role?: string | null;
}

/**
 * Contexto de debate necesario para construir el overlay de sistema en modo debate.
 */
export interface PromptDebateContext {
  /** Personaje que debe intervenir en el turno actual. */
  currentSpeaker: PromptCharacterSummary;
  /** Personaje contrincante del debate. */
  opponent: PromptCharacterSummary;
  /** Orden del turno en la ronda actual ("A", "B" o "forced"). */
  turnOrder?: "A" | "B" | "forced";
  /** Indica si el turno fue forzado explicitamente por el moderador. */
  isForcedTurn?: boolean;
  /** Indica si el modelo puede decidir pasar su turno. */
  allowSkip?: boolean;
}

/**
 * Parametros de entrada para la funcion que construye el prompt de sistema completo.
 */
export interface SystemPromptInput {
  /** Entidad completa del personaje con todos sus atributos narrativos. */
  character: Character;
  /** Modo de conversacion que determina el overlay de comportamiento a aplicar. */
  mode: PromptMode;
  /** Indica si la sesion es en tiempo real (modo llamada). */
  isRealtime?: boolean;
  /** Contexto de debate requerido cuando el modo es "debate". */
  debate?: PromptDebateContext;
}

/**
 * Parametros de entrada para la funcion que construye el prompt de generacion de sugerencias.
 */
export interface SuggestionsPromptInput {
  /** Modo de conversacion activo que determina el tipo de sugerencias a generar. */
  mode: PromptMode;
  /** Ultimos mensajes del historial de conversacion para dar contexto al LLM. */
  lastMessages: Array<Pick<Message, "role" | "content">>;
  /** Nombre del personaje principal de la conversacion. */
  characterName?: string;
  /** Contexto de debate requerido cuando el modo es "debate". */
  debate?: PromptDebateContext;
}