/**
 * @file supabase-storage.service.ts
 * @description Implementacion de la interfaz IStorageService utilizando el almacenamiento de Supabase.
 * Permite subir, eliminar y obtener URLs firmadas temporales para archivos de audio y otros medios.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { IStorageService } from '../../shared/types.js';
import { logger } from '../logging/logger.js';

/**
 * Servicio encargado de gestionar el almacenamiento de archivos (como grabaciones de voz)
 * utilizando el servicio de Supabase Storage.
 */
export class SupabaseStorageService implements IStorageService {
  /**
   * Crea una instancia de SupabaseStorageService.
   *
   * @param supabase - Cliente instanciado de Supabase.
   */
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Sube un archivo a un bucket determinado de Supabase Storage.
   *
   * @param bucket - Nombre del bucket de destino.
   * @param path - Ruta o nombre de archivo de destino dentro del bucket.
   * @param file - Contenido del archivo en un Buffer binario.
   * @param mimeType - Tipo MIME del archivo para la cabecera Content-Type.
   * @returns La ruta interna del archivo subido.
   * @throws Error si ocurre un fallo durante la transferencia a Supabase.
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
   * Obtiene una URL firmada y temporal para acceder a un recurso privado en el bucket.
   *
   * @param bucket - Nombre del bucket.
   * @param path - Ruta del recurso dentro del bucket.
   * @param expiresInSeconds - Tiempo de vigencia de la firma en segundos.
   * @returns Cadena con la URL firmada temporal.
   * @throws Error si falla la generacion de la URL firmada.
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

  /**
   * Elimina uno o mas archivos de un bucket de almacenamiento.
   *
   * @param bucket - Nombre del bucket.
   * @param paths - Lista de rutas de los archivos a eliminar.
   * @throws Error si falla el borrado de algun archivo.
   */
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