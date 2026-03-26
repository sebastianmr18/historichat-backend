import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBackgroundImageUrlToCharacter1779000000000 implements MigrationInterface {
  name = "AddBackgroundImageUrlToCharacter1779000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      ADD COLUMN IF NOT EXISTS background_image_url TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      DROP COLUMN IF EXISTS background_image_url
    `);
  }
}
