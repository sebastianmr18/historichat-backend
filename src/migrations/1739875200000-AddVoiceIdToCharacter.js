export class AddVoiceIdToCharacter1739875200000 {
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "app_character" ADD "voice_id" varchar(50)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "app_character" DROP COLUMN "voice_id"`);
    }
}
