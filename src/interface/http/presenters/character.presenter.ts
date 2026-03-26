import { Character } from "../../../infrastructure/database/entities/Character.js";
import { IStorageService } from "../../../shared/types.js";
import { logger } from "../../../infrastructure/logging/logger.js";

const IMAGE_BUCKET = "characters";

function getImagePathCandidates(imagePath: string): string[] {
  const raw = imagePath.trim();
  const withoutLeadingSlash = raw.replace(/^\/+/, "");
  const withoutBucketPrefix = withoutLeadingSlash.startsWith(`${IMAGE_BUCKET}/`)
    ? withoutLeadingSlash.slice(IMAGE_BUCKET.length + 1)
    : withoutLeadingSlash;

  return [...new Set([raw, withoutLeadingSlash, withoutBucketPrefix].filter(Boolean))];
}

async function signImagePath(
  storage: IStorageService,
  character: Character,
  field: "imageUrl" | "backgroundImageUrl",
  expiresInSeconds: number,
): Promise<string | null> {
  const imagePath = character[field];

  if (!imagePath) {
    return null;
  }

  const pathCandidates = getImagePathCandidates(imagePath);
  const errors: string[] = [];

  for (const pathCandidate of pathCandidates) {
    try {
      const signedUrl = await storage.getSignedUrl(IMAGE_BUCKET, pathCandidate, expiresInSeconds);

      if (pathCandidate !== imagePath) {
        logger.warn("[character.presenter] signed_with_normalized_path", {
          characterId: character.id,
          field,
          originalImagePath: imagePath,
          normalizedImagePath: pathCandidate,
        });
      }

      return signedUrl;
    } catch (error: any) {
      errors.push(`${pathCandidate}: ${error?.message ?? "Unknown signing error"}`);
    }
  }

  logger.warn("[character.presenter] signing_failed", {
    characterId: character.id,
    field,
    imagePath,
    triedPathCandidates: pathCandidates,
    errors,
  });

  return null;
}

export async function withSignedImageUrls(
  storage: IStorageService,
  character: Character,
  expiresInSeconds: number,
) {
  const imageUrl = await signImagePath(storage, character, "imageUrl", expiresInSeconds);
  const backgroundImageUrl = await signImagePath(storage, character, "backgroundImageUrl", expiresInSeconds);

  return {
    ...character,
    imageUrl,
    backgroundImageUrl,
  };
}

export async function withSignedImageUrlsBatch(
  storage: IStorageService,
  characters: Character[],
  expiresInSeconds: number,
) {
  return Promise.all(characters.map((c) => withSignedImageUrls(storage, c, expiresInSeconds)));
}
