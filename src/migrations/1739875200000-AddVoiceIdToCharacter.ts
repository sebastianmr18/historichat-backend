import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVoiceIdToCharacter1739875200000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_character" ADD COLUMN IF NOT EXISTS "voice_id" varchar(50)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "app_character" DROP COLUMN IF EXISTS "voice_id"`);
    }

}