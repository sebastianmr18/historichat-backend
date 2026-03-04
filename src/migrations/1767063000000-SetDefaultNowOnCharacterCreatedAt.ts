import type { MigrationInterface, QueryRunner } from "typeorm";

export class SetDefaultNowOnCharacterCreatedAt1767063000000 implements MigrationInterface {
  name = "SetDefaultNowOnCharacterCreatedAt1767063000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      ALTER COLUMN created_at SET DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      ALTER COLUMN created_at DROP DEFAULT
    `);
  }
}
