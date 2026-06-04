/**
 * @file repository.interfaces.ts
 * @description Interfaces y contratos de diseño para el patrón repositorio y la gestión de transacciones.
 * Abstrae el acceso directo a la base de datos permitiendo implementaciones desacopladas y facilitando el testing.
 */

import type { FindOneOptions, FindManyOptions, DeepPartial, DeleteResult, UpdateResult } from "typeorm";

/**
 * Interfaz genérica para repositorios de datos.
 * Define las operaciones básicas de lectura y escritura (CRUD) sobre entidades.
 * 
 * @template T - Tipo de la entidad gestionada por el repositorio.
 */
export interface IRepository<T> {
  /**
   * Busca múltiples entidades según los criterios proporcionados.
   * 
   * @param options - Opciones de filtrado, paginación u ordenamiento de TypeORM.
   * @returns Promesa que resuelve a un arreglo con las entidades encontradas.
   */
  find(options?: FindManyOptions<T>): Promise<T[]>;

  /**
   * Busca una única entidad que cumpla con los criterios indicados.
   * 
   * @param options - Criterios de búsqueda y selección de relaciones.
   * @returns Promesa que resuelve a la entidad encontrada, o null si no existe.
   */
  findOne(options: FindOneOptions<T>): Promise<T | null>;

  /**
   * Instancia una nueva entidad sin persistirla inmediatamente.
   * 
   * @param entityLike - Datos parciales compatibles con la entidad.
   * @returns Objeto de la entidad instanciada.
   */
  create(entityLike: DeepPartial<T>): T;

  /**
   * Persiste o actualiza la entidad en la base de datos de manera atómica.
   * 
   * @param entity - Datos parciales o completos de la entidad a guardar.
   * @returns Promesa que resuelve a la entidad guardada con los identificadores asignados.
   */
  save(entity: DeepPartial<T>): Promise<T>;

  /**
   * Actualiza registros específicos basándose en criterios detallados.
   * 
   * @param criteria - Identificadores o condiciones del registro a actualizar.
   * @param partialEntity - Objeto parcial con los nuevos valores.
   * @returns Promesa con el resultado de la actualización de TypeORM.
   */
  update(criteria: any, partialEntity: any): Promise<UpdateResult>;

  /**
   * Elimina registros basándose en criterios o identificadores.
   * 
   * @param criteria - Condiciones o IDs de los registros a eliminar de forma permanente.
   * @returns Promesa con el resultado de la eliminación de TypeORM.
   */
  delete(criteria: any): Promise<DeleteResult>;
}

/**
 * Interfaz para el administrador de transacciones locales.
 * Permite guardar entidades dentro del alcance de una transacción en curso.
 */
export interface ITransactionManager {
  /**
   * Guarda o actualiza una entidad dentro de la transacción activa.
   * 
   * @template E - Tipo de la entidad a persistir.
   * @param entityClass - La clase constructora de la entidad.
   * @param entity - Los datos de la entidad a persistir.
   * @returns Promesa que resuelve a la entidad guardada.
   */
  save<E>(entityClass: new (...args: any[]) => E, entity: DeepPartial<E>): Promise<E>;
}

/**
 * Interfaz del proveedor de conexión de datos (DataSource).
 * Expone la capacidad de envolver operaciones concurrentes bajo transacciones atómicas de base de datos.
 */
export interface IDataSource {
  /**
   * Ejecuta un callback aislado dentro de una transacción.
   * 
   * @template R - Tipo del resultado que devolverá la transacción.
   * @param cb - Función callback a ejecutar que recibe el administrador de transacciones.
   * @returns Promesa que resuelve al resultado retornado por la ejecución del callback.
   */
  transaction<R>(cb: (manager: ITransactionManager) => Promise<R>): Promise<R>;
}
