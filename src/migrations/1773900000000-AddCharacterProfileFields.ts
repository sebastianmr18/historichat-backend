import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCharacterProfileFields1773900000000 implements MigrationInterface {
  name = "AddCharacterProfileFields1773900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS theme_color TEXT,
      ADD COLUMN IF NOT EXISTS theme_color_light TEXT,
      ADD COLUMN IF NOT EXISTS years TEXT,
      ADD COLUMN IF NOT EXISTS category TEXT,
      ADD COLUMN IF NOT EXISTS epoch TEXT,
      ADD COLUMN IF NOT EXISTS quote TEXT,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS badge TEXT,
      ADD COLUMN IF NOT EXISTS topics JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'app_character_badge_check'
        ) THEN
          ALTER TABLE public.app_character
          ADD CONSTRAINT app_character_badge_check
          CHECK (badge IS NULL OR badge IN ('popular', 'new'));
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_character
      DROP CONSTRAINT IF EXISTS app_character_badge_check
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_character
      DROP COLUMN IF EXISTS topics,
      DROP COLUMN IF EXISTS badge,
      DROP COLUMN IF EXISTS image_url,
      DROP COLUMN IF EXISTS quote,
      DROP COLUMN IF EXISTS epoch,
      DROP COLUMN IF EXISTS category,
      DROP COLUMN IF EXISTS years,
      DROP COLUMN IF EXISTS theme_color_light,
      DROP COLUMN IF EXISTS theme_color,
      DROP COLUMN IF EXISTS description
    `);
  }
}