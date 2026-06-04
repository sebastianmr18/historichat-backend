/**
 * @file character.presenter.ts
 * @description Presentador para transformar y firmar URLs de almacenamiento en las entidades de personaje.
 */
import { Character } from "../../../infrastructure/database/entities/Character.js";
import { CharacterGalleryImage } from "../../../infrastructure/database/entities/CharacterGalleryImage.js";
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

async function signStoragePath(
  storage: IStorageService,
  pathValue: string | null | undefined,
  expiresInSeconds: number,
  logContext: Record<string, unknown>,
): Promise<string | null> {
  if (!pathValue) {
    return null;
  }

  const pathCandidates = getImagePathCandidates(pathValue);
  const errors: string[] = [];

  for (const pathCandidate of pathCandidates) {
    try {
      const signedUrl = await storage.getSignedUrl(IMAGE_BUCKET, pathCandidate, expiresInSeconds);

      if (pathCandidate !== pathValue) {
        logger.warn("[character.presenter] signed_with_normalized_path", {
          ...logContext,
          originalImagePath: pathValue,
          normalizedImagePath: pathCandidate,
        });
      }

      return signedUrl;
    } catch (error: any) {
      errors.push(`${pathCandidate}: ${error?.message ?? "Unknown signing error"}`);
    }
  }

  logger.warn("[character.presenter] signing_failed", {
    ...logContext,
    imagePath: pathValue,
    triedPathCandidates: pathCandidates,
    errors,
  });

  return null;
}

async function signImagePath(
  storage: IStorageService,
  character: Character,
  field: "imageUrl" | "backgroundImageUrl",
  expiresInSeconds: number,
): Promise<string | null> {
  return signStoragePath(storage, character[field], expiresInSeconds, {
    characterId: character.id,
    field,
  });
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

export async function withSignedGalleryImageUrls(
  storage: IStorageService,
  galleryImages: CharacterGalleryImage[],
  expiresInSeconds: number,
) {
  return Promise.all(
    galleryImages.map(async (galleryImage) => ({
      ...galleryImage,
      imageUrl: await signStoragePath(storage, galleryImage.imageUrl, expiresInSeconds, {
        galleryImageId: galleryImage.id,
        characterId: galleryImage.characterId,
        field: "imageUrl",
      }),
    })),
  );
}
