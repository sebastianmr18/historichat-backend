import type { MigrationInterface, QueryRunner } from "typeorm";

export class SeedCharacterEditorialContent1781000001000 implements MigrationInterface {
  name = "SeedCharacterEditorialContent1781000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE public.app_character
      SET
        ambient_label = COALESCE(ambient_label, 'Berna, Zurich, Princeton'),
        content_variant = COALESCE(content_variant, 'editorial_v1')
      WHERE name = 'Albert Einstein'
    `);

    await queryRunner.query(`
      WITH source_quotes AS (
        SELECT
          c.id AS character_id,
          NULLIF(BTRIM(c.quote), '') AS quote_text,
          c.name AS attribution
        FROM public.app_character c
        WHERE NULLIF(BTRIM(c.quote), '') IS NOT NULL
      )
      INSERT INTO public.app_character_quote (
        character_id,
        text,
        attribution,
        sort_order,
        is_featured
      )
      SELECT
        s.character_id,
        s.quote_text,
        s.attribution,
        0,
        true
      FROM source_quotes s
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.app_character_quote q
        WHERE q.character_id = s.character_id
          AND q.sort_order = 0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM public.app_character_quote q
      USING public.app_character c
      WHERE q.character_id = c.id
        AND q.sort_order = 0
        AND q.is_featured = true
        AND q.attribution = c.name
        AND q.text = c.quote
    `);

    await queryRunner.query(`
      UPDATE public.app_character
      SET
        ambient_label = CASE
          WHEN ambient_label = 'Berna, Zurich, Princeton' THEN NULL
          ELSE ambient_label
        END,
        content_variant = CASE
          WHEN content_variant = 'editorial_v1' THEN NULL
          ELSE content_variant
        END
      WHERE name = 'Albert Einstein'
    `);
  }
}