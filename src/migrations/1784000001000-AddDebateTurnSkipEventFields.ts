import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDebateTurnSkipEventFields1784000001000 implements MigrationInterface {
  name = "AddDebateTurnSkipEventFields1784000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_message" ADD COLUMN IF NOT EXISTS "event_type" varchar(20) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "app_message" ADD COLUMN IF NOT EXISTS "event_meta_json" jsonb NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "app_message" DROP COLUMN IF EXISTS "event_meta_json"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_message" DROP COLUMN IF EXISTS "event_type"`
    );
  }
}
