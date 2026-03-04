import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageService } from '../../shared/types.js';
import { logger } from '../logging/logger.js';

/**
 * @class SupabaseStorageService
 * @description Implementación de StorageService utilizando Supabase Storage.
 */
export class SupabaseStorageService implements IStorageService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * @method uploadFile
   * @param bucket Nombre del bucket.
   * @param path Ruta de destino en el bucket.
   * @param file Buffer del archivo a subir.
   * @param mimeType Tipo MIME del archivo.
   * @returns La ruta relativa del archivo subido.
   * @throws Error si la subida falla.
   */
  async uploadFile(bucket: string, path: string, file: Buffer, mimeType: string): Promise<string> {
    logger.debug('[storage.uploadFile] started', {
      bucket,
      path,
      mimeType,
      fileBytes: file.length,
    });

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      logger.error('[storage.uploadFile] failed', {
        bucket,
        path,
        mimeType,
        fileBytes: file.length,
        error: {
          message: error.message,
          name: error.name,
        },
      });
      throw new Error(`Failed to upload file to Supabase: ${error.message}`);
    }

    logger.debug('[storage.uploadFile] completed', {
      bucket,
      path,
      uploadedPath: data.path,
    });

    return data.path;
  }

  /**
   * @method getSignedUrl
   * @param bucket Nombre del bucket.
   * @param path Ruta del archivo en el bucket.
   * @param expiresInSeconds Tiempo de expiración de la URL en segundos.
   * @returns URL temporal firmada.
   * @throws Error si la generación de la URL falla.
   */
  async getSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    const normalizedPaths = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];

    if (normalizedPaths.length === 0) {
      return;
    }

    logger.debug('[storage.deleteFiles] started', {
      bucket,
      fileCount: normalizedPaths.length,
    });

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .remove(normalizedPaths);

    if (error) {
      logger.error('[storage.deleteFiles] failed', {
        bucket,
        fileCount: normalizedPaths.length,
        paths: normalizedPaths,
        error: {
          message: error.message,
          name: error.name,
        },
      });
      throw new Error(`Failed to delete files from Supabase: ${error.message}`);
    }

    logger.debug('[storage.deleteFiles] completed', {
      bucket,
      fileCount: normalizedPaths.length,
      removedCount: data?.length ?? 0,
    });
  }
}