import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCharacterEditorialLayoutSupport1781000002000 implements MigrationInterface {
  name = "AddCharacterEditorialLayoutSupport1781000002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_editorial_block (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        block_key varchar(80) NOT NULL,
        title varchar(120),
        body text NOT NULL,
        page_key varchar(40) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_editorial_block_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_content_variant_copy (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        content_variant varchar(50) NOT NULL,
        copy_key varchar(80) NOT NULL,
        text text NOT NULL,
        page_key varchar(40) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_copy_override (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        copy_key varchar(80) NOT NULL,
        text text NOT NULL,
        page_key varchar(40) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_copy_override_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_editorial_block_character_id
      ON public.app_character_editorial_block(character_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_editorial_block_character_page_sort
      ON public.app_character_editorial_block(character_id, page_key, sort_order)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_editorial_block_character_block_key
      ON public.app_character_editorial_block(character_id, block_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_content_variant_copy_variant
      ON public.app_content_variant_copy(content_variant)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_content_variant_copy_variant_page_sort
      ON public.app_content_variant_copy(content_variant, page_key, sort_order)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_content_variant_copy_variant_copy_key
      ON public.app_content_variant_copy(content_variant, copy_key)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_copy_override_character_id
      ON public.app_character_copy_override(character_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_copy_override_character_page_sort
      ON public.app_character_copy_override(character_id, page_key, sort_order)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_copy_override_character_copy_key
      ON public.app_character_copy_override(character_id, copy_key)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_copy_override_character_copy_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_copy_override_character_page_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_copy_override_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_content_variant_copy_variant_copy_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_content_variant_copy_variant_page_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_content_variant_copy_variant`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_editorial_block_character_block_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_editorial_block_character_page_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_editorial_block_character_id`);

    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_copy_override`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_content_variant_copy`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_editorial_block`);
  }
}