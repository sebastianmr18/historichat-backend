import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDebateTurnControlFields1782000000000 implements MigrationInterface {
  name = "AddDebateTurnControlFields1782000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD COLUMN IF NOT EXISTS debate_turn_mode VARCHAR(20) NOT NULL DEFAULT 'auto_alternate'
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD COLUMN IF NOT EXISTS preferred_opening_speaker_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD COLUMN IF NOT EXISTS next_speaker_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD COLUMN IF NOT EXISTS last_forced_speaker_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD COLUMN IF NOT EXISTS debate_settings JSONB
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_conversation_next_speaker_id
      ON public.app_conversation(next_speaker_id)
      WHERE next_speaker_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_conversation_preferred_opening_speaker_id
      ON public.app_conversation(preferred_opening_speaker_id)
      WHERE preferred_opening_speaker_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_conversation_preferred_opening_speaker_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_conversation_next_speaker_id`);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP COLUMN IF EXISTS debate_settings
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP COLUMN IF EXISTS last_forced_speaker_id
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP COLUMN IF EXISTS next_speaker_id
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP COLUMN IF EXISTS preferred_opening_speaker_id
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP COLUMN IF EXISTS debate_turn_mode
    `);
  }
}
