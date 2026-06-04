/**
 * @file suggestions-prompt-builder.ts
 * @description Constructor de prompts de sugerencias de conversacion.
 * Genera prompts en base al modo actual (entrevista, llamada o debate) para sugerir
 * los siguientes posibles mensajes que el usuario podria enviar.
 */

import { SuggestionsPromptInput } from "./prompt.types.js";

/**
 * Formatea los ultimos 4 mensajes de la conversacion en una cadena de texto.
 * Esto ayuda a dar contexto al LLM para generar sugerencias coherentes.
 *
 * @param input - Parametros de entrada con la lista de mensajes.
 * @returns Cadena formateada con el rol y contenido de cada mensaje.
 */
function formatRecentMessages(input: SuggestionsPromptInput): string {
  return input.lastMessages
    .slice(-4)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");
}

/**
 * Construye el prompt de sugerencias para el modo entrevista.
 *
 * @param input - Parametros de entrada para las sugerencias.
 * @returns Cadena de texto con las instrucciones del prompt de entrevista.
 */
function buildInterviewSuggestionsPrompt(input: SuggestionsPromptInput): string {
  return `Genera exactamente 3 sugerencias en espanol para que el usuario entreviste al personaje.
El personaje es el entrevistado y el usuario conduce la entrevista.
Las 3 sugerencias deben cubrir: 1) profundizar en lo dicho, 2) cambio de tema natural, 3) pregunta personal o reflexiva.
Cada sugerencia debe ser breve (maximo 80 caracteres), accionable y lista para enviarse como mensaje.
No uses comillas externas ni explicaciones.

Conversacion:
${formatRecentMessages(input)}

Devuelve JSON valido con este formato exacto: { "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"] }`;
}

/**
 * Construye el prompt de sugerencias para el modo llamada (conversacion por voz).
 *
 * @param input - Parametros de entrada para las sugerencias.
 * @returns Cadena de texto con las instrucciones del prompt de llamada.
 */
function buildCallSuggestionsPrompt(input: SuggestionsPromptInput): string {
  return `Genera exactamente 3 sugerencias en espanol para continuar una conversacion por voz con ${input.characterName ?? "el personaje"}.
Las sugerencias deben sonar naturales al decirse en voz alta.
Deben cubrir: 1) pedir una aclaracion, 2) profundizar en una idea, 3) cambiar de tema suavemente.
Cada sugerencia debe ser breve (maximo 60 caracteres), directa y facil de pronunciar.
No uses comillas externas ni explicaciones.

Conversacion:
${formatRecentMessages(input)}

Devuelve JSON valido con este formato exacto: { "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"] }`;
}

/**
 * Construye el prompt de sugerencias para el modo debate.
 *
 * @param input - Parametros de entrada para las sugerencias.
 * @returns Cadena de texto con las instrucciones del prompt de debate.
 */
function buildDebateSuggestionsPrompt(input: SuggestionsPromptInput): string {
  const currentSpeaker = input.debate?.currentSpeaker.name ?? input.characterName ?? "el participante";
  const opponent = input.debate?.opponent.name ?? "el otro participante";

  return `Genera exactamente 3 sugerencias en espanol para que el usuario conduzca un debate entre ${currentSpeaker} and ${opponent}.
Las sugerencias deben cubrir: 1) pedir refutacion, 2) exigir evidencia o ejemplo, 3) abrir una nueva arista del tema.
Cada sugerencia debe ser breve (maximo 80 caracteres), clara y lista para enviarse como mensaje.
No uses comillas externas ni explicaciones.

Conversacion:
${formatRecentMessages(input)}

Devuelve JSON valido con este formato exacto: { "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"] }`;
}

/**
 * Mapa de constructores de prompts de sugerencia segun el modo de conversacion.
 */
const MODE_SUGGESTION_BUILDERS = {
  interview: buildInterviewSuggestionsPrompt,
  call: buildCallSuggestionsPrompt,
  debate: buildDebateSuggestionsPrompt,
} satisfies Record<SuggestionsPromptInput["mode"], (input: SuggestionsPromptInput) => string>;

/**
 * Construye el prompt de sugerencias de conversacion adecuado en base al modo configurado.
 *
 * @param input - Datos de entrada que incluyen el modo y el historial.
 * @returns Instruccion de prompt para generar sugerencias estructuradas.
 */
export function buildModeSuggestionsPrompt(input: SuggestionsPromptInput): string {
  return MODE_SUGGESTION_BUILDERS[input.mode](input);
}