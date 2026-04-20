import { Character } from "../../infrastructure/database/entities/Character.js";

export interface SpeakerMentionDetectionResult {
  speakerId?: string;
  mentionText?: string;
  confidence?: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectCandidateNames(character: Character): string[] {
  const names = new Set<string>();
  const fullName = normalize(character.name);
  if (fullName) {
    names.add(fullName);
  }

  const firstName = fullName.split(/\s+/).filter(Boolean)[0];
  if (firstName && firstName.length >= 3) {
    names.add(firstName);
  }

  return Array.from(names);
}

function detectSpeakerByLetter(
  normalizedText: string,
  speakerA: Character,
  speakerB: Character
): SpeakerMentionDetectionResult | null {
  const explicitTokenRegex = /@([ab])\b/g;
  const explicitMatches = Array.from(normalizedText.matchAll(explicitTokenRegex)).map((m) => m[1]);

  if (explicitMatches.length > 0) {
    const mentionsA = explicitMatches.includes("a");
    const mentionsB = explicitMatches.includes("b");
    if (mentionsA && mentionsB) {
      return { confidence: 0 };
    }
    if (mentionsA) {
      return { speakerId: speakerA.id, mentionText: "@A", confidence: 0.98 };
    }
    return { speakerId: speakerB.id, mentionText: "@B", confidence: 0.98 };
  }

  const vocativeRegex = /^(?:hey|ey|hola|oye|oigan|oiga)?\s*([ab])(?:\s|,|:|\?|!|$)/;
  const vocativeMatch = normalizedText.match(vocativeRegex);
  if (!vocativeMatch) {
    return null;
  }

  if (vocativeMatch[1] === "a") {
    return { speakerId: speakerA.id, mentionText: "A", confidence: 0.9 };
  }

  return { speakerId: speakerB.id, mentionText: "B", confidence: 0.9 };
}

function detectSpeakerByName(
  normalizedText: string,
  speakerA: Character,
  speakerB: Character
): SpeakerMentionDetectionResult | null {
  const candidateA = collectCandidateNames(speakerA);
  const candidateB = collectCandidateNames(speakerB);

  const matchedA = candidateA.find((name) => new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(normalizedText));
  const matchedB = candidateB.find((name) => new RegExp(`\\b${escapeRegex(name)}\\b`, "i").test(normalizedText));

  if (matchedA && matchedB) {
    return { confidence: 0 };
  }

  if (matchedA) {
    return { speakerId: speakerA.id, mentionText: matchedA, confidence: 0.82 };
  }

  if (matchedB) {
    return { speakerId: speakerB.id, mentionText: matchedB, confidence: 0.82 };
  }

  return null;
}

export function detectDebateMentionedSpeaker(params: {
  userText: string;
  speakerA: Character;
  speakerB: Character;
  minConfidence: number;
}): SpeakerMentionDetectionResult {
  const normalizedText = normalize(params.userText);
  if (!normalizedText) {
    return {};
  }

  const letterDetection = detectSpeakerByLetter(normalizedText, params.speakerA, params.speakerB);
  if (letterDetection?.speakerId && (letterDetection.confidence ?? 0) >= params.minConfidence) {
    return letterDetection;
  }

  if (letterDetection && !letterDetection.speakerId) {
    return {};
  }

  const nameDetection = detectSpeakerByName(normalizedText, params.speakerA, params.speakerB);
  if (nameDetection?.speakerId && (nameDetection.confidence ?? 0) >= params.minConfidence) {
    return nameDetection;
  }

  return {};
}
