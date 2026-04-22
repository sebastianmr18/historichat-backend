import type { MigrationInterface, QueryRunner } from "typeorm";
import { createSuffixedCharacterSlug, getCharacterSlugBase } from "../shared/character-slug.js";

type CharacterSlugRow = {
  id: string;
  name: string;
};

export class AddCharacterPublicSlug1787000000000 implements MigrationInterface {
  name = "AddCharacterPublicSlug1787000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      ADD COLUMN IF NOT EXISTS public_slug text
    `);

    const rows = (await queryRunner.query(`
      SELECT id, name
      FROM public.app_character
      ORDER BY created_at ASC NULLS LAST, id ASC
    `)) as CharacterSlugRow[];

    const usedSlugs = new Set<string>();

    for (const row of rows) {
      const baseSlug = getCharacterSlugBase(row.name);
      let sequence = 1;
      let publicSlug = createSuffixedCharacterSlug(baseSlug, sequence);

      while (usedSlugs.has(publicSlug)) {
        sequence += 1;
        publicSlug = createSuffixedCharacterSlug(baseSlug, sequence);
      }

      usedSlugs.add(publicSlug);

      await queryRunner.query(
        `
          UPDATE public.app_character
          SET public_slug = $2
          WHERE id = $1
        `,
        [row.id, publicSlug],
      );
    }

    await queryRunner.query(`
      ALTER TABLE public.app_character
      ALTER COLUMN public_slug SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      ADD CONSTRAINT app_character_public_slug_not_blank
      CHECK (length(trim(public_slug)) > 0)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_app_character_public_slug
      ON public.app_character (public_slug)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS public.idx_app_character_public_slug
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      DROP CONSTRAINT IF EXISTS app_character_public_slug_not_blank
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      DROP COLUMN IF EXISTS public_slug
    `);
  }
}