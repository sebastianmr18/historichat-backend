import type { FindOneOptions, FindManyOptions, DeepPartial, DeleteResult, UpdateResult } from "typeorm";

export interface IRepository<T> {
  find(options?: FindManyOptions<T>): Promise<T[]>;
  findOne(options: FindOneOptions<T>): Promise<T | null>;
  create(entityLike: DeepPartial<T>): T;
  save(entity: DeepPartial<T>): Promise<T>;
  update(criteria: any, partialEntity: any): Promise<UpdateResult>;
  delete(criteria: any): Promise<DeleteResult>;
}

export interface ITransactionManager {
  save<T>(entityClass: new (...args: any[]) => T, entity: DeepPartial<T>): Promise<T>;
}

export interface IDataSource {
  transaction<T>(cb: (manager: ITransactionManager) => Promise<T>): Promise<T>;
}
