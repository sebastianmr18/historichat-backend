import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialSchema1739000000000 implements MigrationInterface {
  name = "CreateInitialSchema1739000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_profile (
        id uuid PRIMARY KEY,
        username text,
        created_at timestamptz DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL,
        role varchar(100) NOT NULL,
        biography text NOT NULL,
        key_traits jsonb NOT NULL DEFAULT '[]'::jsonb,
        speech_tics jsonb NOT NULL DEFAULT '[]'::jsonb,
        vector_db_name varchar(150) NOT NULL DEFAULT '',
        voice_id varchar(50),
        created_at timestamptz NOT NULL DEFAULT now(),
        user_id uuid,
        is_public boolean NOT NULL DEFAULT false,
        CONSTRAINT app_character_user_id_fkey
          FOREIGN KEY (user_id)
          REFERENCES public.app_profile (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_conversation (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at timestamptz NOT NULL DEFAULT now(),
        character_id uuid NOT NULL,
        user_id uuid NOT NULL,
        CONSTRAINT app_conversation_character_id_b42f2e73_fk_app_character_id
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          DEFERRABLE INITIALLY DEFERRED,
        CONSTRAINT fk_app_conversation_user
          FOREIGN KEY (user_id)
          REFERENCES public.app_profile (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_message (
        id SERIAL PRIMARY KEY,
        role varchar(10) NOT NULL,
        content text NOT NULL,
        timestamp timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        conversation_id uuid NOT NULL,
        audio_path text,
        audio_storage_id text,
        media_type text,
        duration_ms integer,
        CONSTRAINT app_message_conversation_id_fkey
          FOREIGN KEY (conversation_id)
          REFERENCES public.app_conversation (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_character_user_id ON public.app_character USING btree (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_character_is_public ON public.app_character USING btree (is_public)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS app_conversation_character_id_b42f2e73 ON public.app_conversation USING btree (character_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_conversation_user_id ON public.app_conversation USING btree (user_id)`);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_message_audio_path
      ON public.app_message(audio_path)
      WHERE audio_path IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_message_audio_path`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_conversation_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.app_conversation_character_id_b42f2e73`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_is_public`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_user_id`);

    await queryRunner.query(`DROP TABLE IF EXISTS public.app_message`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_conversation`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_profile`);
  }
}
