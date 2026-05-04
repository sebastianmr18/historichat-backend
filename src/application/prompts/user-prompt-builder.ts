// Strips any attempt to inject our structural XML tags from external content
// (user input or RAG context) before it enters the final prompt.
const STRUCTURAL_TAG_PATTERN =
  /<\/?(system_identity|behavior_rules|retrieved_context|user_message)\s*>/gi;

function stripStructuralTags(text: string): string {
  STRUCTURAL_TAG_PATTERN.lastIndex = 0;
  return text.replace(STRUCTURAL_TAG_PATTERN, "");
}

export function buildFinalUserPrompt(userQuery: string, contextRAG?: string): string {
  const safeQuery = stripStructuralTags(userQuery);

  if (contextRAG?.trim()) {
    const safeRag = stripStructuralTags(contextRAG);
    return `<retrieved_context>\n${safeRag}\n</retrieved_context>\n\n<user_message>\n${safeQuery}\n</user_message>`;
  }

  return `<user_message>\n${safeQuery}\n</user_message>`;
}
