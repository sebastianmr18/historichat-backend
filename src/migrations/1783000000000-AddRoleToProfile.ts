import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRoleToProfile1783000000000 implements MigrationInterface {
  name = "AddRoleToProfile1783000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.app_profile
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_profile
      DROP CONSTRAINT IF EXISTS app_profile_role_check
    `);

    await queryRunner.query(`
      ALTER TABLE public.app_profile
      ADD CONSTRAINT app_profile_role_check
      CHECK (role IN ('user', 'admin'))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_profile_role
      ON public.app_profile USING btree (role)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS public.idx_app_profile_role`);
    await queryRunner.query(`ALTER TABLE public.app_profile DROP CONSTRAINT IF EXISTS app_profile_role_check`);
    await queryRunner.query(`ALTER TABLE public.app_profile DROP COLUMN IF EXISTS role`);
  }
}