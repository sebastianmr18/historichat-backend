import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceCascadeOnMessageConversationFk1767063600000 implements MigrationInterface {
  name = "EnforceCascadeOnMessageConversationFk1767063600000";

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
            AND tc.table_name = 'app_message'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = 'conversation_id'
        LOOP
          EXECUTE format('ALTER TABLE public.app_message DROP CONSTRAINT %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      ADD CONSTRAINT app_message_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.app_conversation (id)
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_message
      DROP CONSTRAINT IF EXISTS app_message_conversation_id_fkey
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_message
      ADD CONSTRAINT app_message_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.app_conversation (id)
    `);
  }
}
