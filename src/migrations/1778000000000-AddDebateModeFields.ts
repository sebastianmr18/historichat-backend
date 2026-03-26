import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddDebateModeFields1778000000000 implements MigrationInterface {
  name = "AddDebateModeFields1778000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD COLUMN IF NOT EXISTS secondary_character_id UUID
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      ADD COLUMN IF NOT EXISTS speaker_character_id UUID
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_app_conversation_secondary_character'
        ) THEN
          ALTER TABLE public.app_conversation
          ADD CONSTRAINT fk_app_conversation_secondary_character
          FOREIGN KEY (secondary_character_id)
          REFERENCES public.app_character(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_app_message_speaker_character'
        ) THEN
          ALTER TABLE public.app_message
          ADD CONSTRAINT fk_app_message_speaker_character
          FOREIGN KEY (speaker_character_id)
          REFERENCES public.app_character(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_conversation_secondary_character_id
      ON public.app_conversation(secondary_character_id)
      WHERE secondary_character_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_message_speaker_character_id
      ON public.app_message(speaker_character_id)
      WHERE speaker_character_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_message_conversation_speaker_timestamp
      ON public.app_message(conversation_id, speaker_character_id, "timestamp", id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_message_conversation_speaker_timestamp`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_message_speaker_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_conversation_secondary_character_id`);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      DROP CONSTRAINT IF EXISTS fk_app_message_speaker_character
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP CONSTRAINT IF EXISTS fk_app_conversation_secondary_character
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      DROP COLUMN IF EXISTS speaker_character_id
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP COLUMN IF EXISTS secondary_character_id
    `);
  }
}