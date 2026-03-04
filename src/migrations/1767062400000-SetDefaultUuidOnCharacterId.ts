import type { MigrationInterface, QueryRunner } from "typeorm";

export class SetDefaultUuidOnCharacterId1767062400000 implements MigrationInterface {
  name = "SetDefaultUuidOnCharacterId1767062400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      ALTER COLUMN id SET DEFAULT uuid_generate_v4()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      ALTER COLUMN id DROP DEFAULT
    `);
  }
}
