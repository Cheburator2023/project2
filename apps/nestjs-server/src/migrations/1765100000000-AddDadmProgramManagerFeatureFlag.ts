import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Feature flag: функционал менеджера программ ДАДМ
 * (утверждение оценки, режимы реестра, версии как исторические срезы).
 * null = env default (`DADM_PROGRAM_MANAGER_ENABLED`, default OFF).
 */
export class AddDadmProgramManagerFeatureFlag1765100000000
	implements MigrationInterface
{
	name = "AddDadmProgramManagerFeatureFlag1765100000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "v2_runtime_settings"
			ADD COLUMN IF NOT EXISTS "dadm_program_manager_enabled" boolean NULL DEFAULT NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "v2_runtime_settings"
			DROP COLUMN IF EXISTS "dadm_program_manager_enabled"
		`);
	}
}
