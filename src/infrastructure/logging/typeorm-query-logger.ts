/**
 * @file typeorm-query-logger.ts
 * @description Registrador personalizado de consultas SQL para TypeORM.
 * Trunca consultas SELECT, consultas de modificacion y parametros muy extensos
 * para evitar sobrecargar los archivos de logs de la aplicacion.
 */

import type { Logger as TypeOrmLogger, QueryRunner } from "typeorm";
import { logger } from "./logger.js";

/** Longitud maxima de log para consultas de tipo SELECT. */
const MAX_SELECT_QUERY_LOG_LENGTH = 420;
/** Longitud maxima de log para consultas de modificacion o creacion (INSERT/UPDATE/DELETE). */
const MAX_NON_SELECT_QUERY_LOG_LENGTH = 700;
/** Longitud maxima para registrar los parametros enlazados de una consulta SQL. */
const MAX_PARAMS_LOG_LENGTH = 240;

/**
 * Convierte de forma segura un valor a JSON para evitar errores circulares en el log.
 *
 * @param value - Valor a serializar.
 * @returns Cadena JSON o "[unserializable]" si falla.
 */
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

/**
 * Trunca una cadena de texto agregando informacion del tamano truncado si excede la longitud maxima.
 *
 * @param value - Cadena de texto a truncar.
 * @param maxLength - Longitud maxima permitida.
 * @returns Cadena truncada o la original si es mas corta.
 */
const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}... [truncated ${value.length - maxLength} chars]`;
};

/**
 * Determina si la consulta es un SELECT para aplicar limites mas estrictos de log.
 *
 * @param query - Sentencia SQL.
 * @returns True si inicia con SELECT.
 */
const isSelectQuery = (query: string): boolean => query.trimStart().toUpperCase().startsWith("SELECT");

/**
 * Reduce la longitud de una consulta segun su tipo para evitar logs sobredimensionados.
 *
 * @param query - Sentencia SQL original.
 * @returns Sentencia SQL resumida.
 */
const summarizeQuery = (query: string): string => {
  const maxLength = isSelectQuery(query)
    ? MAX_SELECT_QUERY_LOG_LENGTH
    : MAX_NON_SELECT_QUERY_LOG_LENGTH;

  return truncate(query, maxLength);
};

/**
 * Serializa y trunca los parametros de una consulta SQL para el log.
 *
 * @param parameters - Lista de parametros enlazados.
 * @returns Cadena serializada y resumida, o null si no hay parametros.
 */
const summarizeParams = (parameters?: unknown[]): string | null => {
  if (!parameters?.length) {
    return null;
  }

  return truncate(safeStringify(parameters), MAX_PARAMS_LOG_LENGTH);
};

/**
 * Registrador de TypeORM que trunca consultas y parametros SQL antes de enviarlos a logs.
 */
export class TruncatedTypeOrmLogger implements TypeOrmLogger {
  /**
   * Registra una consulta SQL ejecutada por el ORM.
   *
   * @param query - Sentencia SQL ejecutada.
   * @param parameters - Parametros enlazados.
   * @param _queryRunner - QueryRunner asociado.
   */
  logQuery(query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    const summarizedQuery = summarizeQuery(query);
    const summarizedParams = summarizeParams(parameters);

    if (summarizedParams) {
      logger.debug("[typeorm.query]", { query: summarizedQuery, parameters: summarizedParams });
      return;
    }

    logger.debug("[typeorm.query]", { query: summarizedQuery });
  }

  /**
   * Registra los fallos o errores ocurridos al ejecutar una consulta SQL.
   *
   * @param error - Error devuelto por la base de datos.
   * @param query - Sentencia SQL que provoco el error.
   * @param parameters - Parametros enlazados.
   * @param _queryRunner - QueryRunner asociado.
   */
  logQueryError(error: string | Error, query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    logger.error("[typeorm.query_error]", {
      error: error instanceof Error ? error.message : String(error),
      query: summarizeQuery(query),
      parameters: summarizeParams(parameters),
    });
  }

  /**
   * Registra consultas SQL lentas detectadas en el sistema.
   *
   * @param time - Tiempo transcurrido en milisegundos.
   * @param query - Sentencia SQL.
   * @param parameters - Parametros enlazados.
   * @param _queryRunner - QueryRunner asociado.
   */
  logQuerySlow(time: number, query: string, parameters?: unknown[], _queryRunner?: QueryRunner): void {
    logger.warn("[typeorm.query_slow]", {
      timeMs: time,
      query: summarizeQuery(query),
      parameters: summarizeParams(parameters),
    });
  }

  /**
   * Registra cambios y construccion de esquemas en la base de datos relacional.
   *
   * @param message - Mensaje del esquema.
   * @param _queryRunner - QueryRunner asociado.
   */
  logSchemaBuild(message: string, _queryRunner?: QueryRunner): void {
    logger.info("[typeorm.schema]", { message });
  }

  /**
   * Registra ejecuciones y progresos de migraciones.
   *
   * @param message - Mensaje de la migracion.
   * @param _queryRunner - QueryRunner asociado.
   */
  logMigration(message: string, _queryRunner?: QueryRunner): void {
    logger.info("[typeorm.migration]", { message });
  }

  /**
   * Registra logs generales del sistema de persistencia segun su nivel.
   *
   * @param level - Nivel de log.
   * @param message - Mensaje o payload.
   * @param _queryRunner - QueryRunner asociado.
   */
  log(level: "log" | "info" | "warn", message: unknown, _queryRunner?: QueryRunner): void {
    const payload = typeof message === "string" ? message : safeStringify(message);

    if (level === "warn") {
      logger.warn("[typeorm]", payload);
      return;
    }

    if (level === "info") {
      logger.info("[typeorm]", payload);
      return;
    }

    logger.debug("[typeorm]", payload);
  }
}
