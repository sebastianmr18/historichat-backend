import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddGenUiFieldsToMessage1767801600000 implements MigrationInterface {
  name = "AddGenUiFieldsToMessage1767801600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_message
      ADD COLUMN IF NOT EXISTS schema_version VARCHAR(20) NOT NULL DEFAULT 'v1_plain',
      ADD COLUMN IF NOT EXISTS blocks JSONB
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_message_schema_version
      ON public.app_message(schema_version)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_message_schema_version`);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      DROP COLUMN IF EXISTS blocks,
      DROP COLUMN IF EXISTS schema_version
    `);
  }
}
