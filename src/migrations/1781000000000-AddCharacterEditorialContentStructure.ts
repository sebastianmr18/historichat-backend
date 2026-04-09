import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCharacterEditorialContentStructure1781000000000 implements MigrationInterface {
  name = "AddCharacterEditorialContentStructure1781000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      ADD COLUMN IF NOT EXISTS ambient_label TEXT,
      ADD COLUMN IF NOT EXISTS content_variant VARCHAR(50)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_quote (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        text text NOT NULL,
        attribution text,
        sort_order integer NOT NULL DEFAULT 0,
        is_featured boolean NOT NULL DEFAULT false,
        CONSTRAINT fk_app_character_quote_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_fact (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        label varchar(80) NOT NULL,
        value text NOT NULL,
        section_key varchar(40) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_fact_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_context_card (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        eyebrow varchar(80),
        title varchar(150) NOT NULL,
        body text NOT NULL,
        icon_key varchar(50),
        page_key varchar(40) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_context_card_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_timeline_entry (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        year_label varchar(20) NOT NULL,
        phase_label varchar(80),
        title varchar(150) NOT NULL,
        description text NOT NULL,
        narrative_text text,
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_timeline_entry_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_relationship (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        name varchar(120) NOT NULL,
        role varchar(120),
        dynamic text,
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_relationship_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_timeline_relationship (
        timeline_entry_id uuid NOT NULL,
        relationship_id uuid NOT NULL,
        CONSTRAINT pk_app_character_timeline_relationship PRIMARY KEY (timeline_entry_id, relationship_id),
        CONSTRAINT fk_app_character_timeline_relationship_entry
          FOREIGN KEY (timeline_entry_id)
          REFERENCES public.app_character_timeline_entry (id)
          ON DELETE CASCADE,
        CONSTRAINT fk_app_character_timeline_relationship_relationship
          FOREIGN KEY (relationship_id)
          REFERENCES public.app_character_relationship (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_prompt (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        label varchar(80),
        prompt text NOT NULL,
        note text,
        cta_label varchar(40),
        sort_order integer NOT NULL DEFAULT 0,
        CONSTRAINT fk_app_character_prompt_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.app_character_gallery_image (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        character_id uuid NOT NULL,
        image_url text NOT NULL,
        alt text,
        caption text,
        credit text,
        source_url text,
        sort_order integer NOT NULL DEFAULT 0,
        is_cover boolean NOT NULL DEFAULT false,
        CONSTRAINT fk_app_character_gallery_image_character
          FOREIGN KEY (character_id)
          REFERENCES public.app_character (id)
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_quote_character_id
      ON public.app_character_quote(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_quote_character_sort
      ON public.app_character_quote(character_id, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_fact_character_id
      ON public.app_character_fact(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_fact_character_section_sort
      ON public.app_character_fact(character_id, section_key, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_context_card_character_id
      ON public.app_character_context_card(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_context_card_character_page_sort
      ON public.app_character_context_card(character_id, page_key, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_timeline_entry_character_id
      ON public.app_character_timeline_entry(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_timeline_entry_character_sort
      ON public.app_character_timeline_entry(character_id, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_relationship_character_id
      ON public.app_character_relationship(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_relationship_character_sort
      ON public.app_character_relationship(character_id, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_timeline_relationship_relationship_id
      ON public.app_character_timeline_relationship(relationship_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_prompt_character_id
      ON public.app_character_prompt(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_prompt_character_sort
      ON public.app_character_prompt(character_id, sort_order)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_character_gallery_image_character_id
      ON public.app_character_gallery_image(character_id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_app_character_gallery_image_character_sort
      ON public.app_character_gallery_image(character_id, sort_order)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_gallery_image_character_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_gallery_image_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_prompt_character_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_prompt_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_timeline_relationship_relationship_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_relationship_character_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_relationship_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_timeline_entry_character_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_timeline_entry_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_context_card_character_page_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_context_card_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_fact_character_section_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_fact_character_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.uq_app_character_quote_character_sort`);
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_character_quote_character_id`);

    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_gallery_image`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_prompt`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_timeline_relationship`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_relationship`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_timeline_entry`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_context_card`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_fact`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.app_character_quote`);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      DROP COLUMN IF EXISTS content_variant,
      DROP COLUMN IF EXISTS ambient_label
    `);
  }
}