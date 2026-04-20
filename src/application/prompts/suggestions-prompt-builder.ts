import { SuggestionsPromptInput } from "./prompt.types.js";

function formatRecentMessages(input: SuggestionsPromptInput): string {
  return input.lastMessages
    .slice(-4)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");
}

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

function buildDebateSuggestionsPrompt(input: SuggestionsPromptInput): string {
  const currentSpeaker = input.debate?.currentSpeaker.name ?? input.characterName ?? "el participante";
  const opponent = input.debate?.opponent.name ?? "el otro participante";

  return `Genera exactamente 3 sugerencias en espanol para que el usuario conduzca un debate entre ${currentSpeaker} y ${opponent}.
Las sugerencias deben cubrir: 1) pedir refutacion, 2) exigir evidencia o ejemplo, 3) abrir una nueva arista del tema.
Cada sugerencia debe ser breve (maximo 80 caracteres), clara y lista para enviarse como mensaje.
No uses comillas externas ni explicaciones.

Conversacion:
${formatRecentMessages(input)}

Devuelve JSON valido con este formato exacto: { "suggestions": ["sugerencia1", "sugerencia2", "sugerencia3"] }`;
}

const MODE_SUGGESTION_BUILDERS = {
  interview: buildInterviewSuggestionsPrompt,
  call: buildCallSuggestionsPrompt,
  debate: buildDebateSuggestionsPrompt,
} satisfies Record<SuggestionsPromptInput["mode"], (input: SuggestionsPromptInput) => string>;

export function buildModeSuggestionsPrompt(input: SuggestionsPromptInput): string {
  return MODE_SUGGESTION_BUILDERS[input.mode](input);
}