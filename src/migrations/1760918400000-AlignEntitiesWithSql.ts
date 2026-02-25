import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignEntitiesWithSql1760918400000 implements MigrationInterface {
  name = "AlignEntitiesWithSql1760918400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.app_profile') IS NULL AND to_regclass('public.profiles') IS NOT NULL THEN
          ALTER TABLE public.profiles RENAME TO app_profile;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE public.app_profile ALTER COLUMN created_at DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE public.app_profile ALTER COLUMN created_at SET DEFAULT now()`);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'app_profile'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'id'
        LOOP
          EXECUTE format('ALTER TABLE public.app_profile DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_profile
      ADD CONSTRAINT app_profile_id_fkey
      FOREIGN KEY (id)
      REFERENCES auth.users (id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`ALTER TABLE public.app_character ADD COLUMN IF NOT EXISTS user_id uuid`);
    await queryRunner.query(`ALTER TABLE public.app_character ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false`);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'app_character'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'user_id'
        LOOP
          EXECUTE format('ALTER TABLE public.app_character DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      ADD CONSTRAINT app_character_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.app_profile (id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_character_user_id ON public.app_character USING btree (user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_character_is_public ON public.app_character USING btree (is_public)`);

    await queryRunner.query(`ALTER TABLE public.app_conversation ADD COLUMN IF NOT EXISTS user_id uuid`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.app_conversation WHERE user_id IS NULL) THEN
          RAISE EXCEPTION 'Cannot set app_conversation.user_id NOT NULL because NULL values exist';
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE public.app_conversation ALTER COLUMN user_id SET NOT NULL`);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'app_conversation'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'character_id'
        LOOP
          EXECUTE format('ALTER TABLE public.app_conversation DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
           AND tc.table_name = kcu.table_name
          WHERE tc.table_schema = 'public'
            AND tc.table_name = 'app_conversation'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'user_id'
        LOOP
          EXECUTE format('ALTER TABLE public.app_conversation DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD CONSTRAINT app_conversation_character_id_b42f2e73_fk_app_character_id
      FOREIGN KEY (character_id)
      REFERENCES public.app_character (id)
      DEFERRABLE INITIALLY DEFERRED
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD CONSTRAINT fk_app_conversation_user
      FOREIGN KEY (user_id)
      REFERENCES public.app_profile (id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS app_conversation_character_id_b42f2e73 ON public.app_conversation USING btree (character_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_conversation_user_id ON public.app_conversation USING btree (user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_conversation_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS app_conversation_character_id_b42f2e73`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_character_is_public`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_app_character_user_id`);

    await queryRunner.query(`ALTER TABLE public.app_conversation DROP CONSTRAINT IF EXISTS fk_app_conversation_user`);
    await queryRunner.query(`ALTER TABLE public.app_conversation DROP CONSTRAINT IF EXISTS app_conversation_character_id_b42f2e73_fk_app_character_id`);
    await queryRunner.query(`ALTER TABLE public.app_conversation ALTER COLUMN user_id DROP NOT NULL`);

    await queryRunner.query(`ALTER TABLE public.app_character DROP CONSTRAINT IF EXISTS app_character_user_id_fkey`);
    await queryRunner.query(`ALTER TABLE public.app_profile DROP CONSTRAINT IF EXISTS app_profile_id_fkey`);

    await queryRunner.query(`ALTER TABLE public.app_profile ALTER COLUMN created_at DROP DEFAULT`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.profiles') IS NULL AND to_regclass('public.app_profile') IS NOT NULL THEN
          ALTER TABLE public.app_profile RENAME TO profiles;
        END IF;
      END $$;
    `);
  }
}
