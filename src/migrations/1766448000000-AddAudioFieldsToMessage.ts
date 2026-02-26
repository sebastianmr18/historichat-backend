import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAudioFieldsToMessage1766448000000 implements MigrationInterface {
  name = "AddAudioFieldsToMessage1766448000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_message
      ADD COLUMN IF NOT EXISTS audio_path TEXT,
      ADD COLUMN IF NOT EXISTS audio_storage_id TEXT,
      ADD COLUMN IF NOT EXISTS media_type TEXT,
      ADD COLUMN IF NOT EXISTS duration_ms INTEGER
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_message_audio_path
      ON public.app_message(audio_path)
      WHERE audio_path IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_message_audio_path`);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      DROP COLUMN IF EXISTS duration_ms,
      DROP COLUMN IF EXISTS media_type,
      DROP COLUMN IF EXISTS audio_storage_id,
      DROP COLUMN IF EXISTS audio_path
    `);
  }
}
