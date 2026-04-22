import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceCascadeOnConversationCharacterFks1784000003000 implements MigrationInterface {
  name = "EnforceCascadeOnConversationCharacterFks1784000003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      ALTER TABLE public.app_conversation
      ADD CONSTRAINT app_conversation_character_id_b42f2e73_fk_app_character_id
      FOREIGN KEY (character_id)
      REFERENCES public.app_character (id)
      ON DELETE CASCADE
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
            AND kcu.column_name = 'secondary_character_id'
        LOOP
          EXECUTE format('ALTER TABLE public.app_conversation DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      ADD CONSTRAINT fk_app_conversation_secondary_character
      FOREIGN KEY (secondary_character_id)
      REFERENCES public.app_character (id)
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP CONSTRAINT IF EXISTS fk_app_conversation_secondary_character
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_conversation
      DROP CONSTRAINT IF EXISTS app_conversation_character_id_b42f2e73_fk_app_character_id
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
      ADD CONSTRAINT fk_app_conversation_secondary_character
      FOREIGN KEY (secondary_character_id)
      REFERENCES public.app_character (id)
      ON DELETE SET NULL
    `);
  }
}