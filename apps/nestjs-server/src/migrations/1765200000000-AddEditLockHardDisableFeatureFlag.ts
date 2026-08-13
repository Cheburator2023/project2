import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Feature flag: жёсткий disable формы при чужом edit-lock.
 * null = env default (`EDIT_LOCK_HARD_DISABLE_ENABLED`, default OFF).
 */
export class AddEditLockHardDisableFeatureFlag1765200000000
	implements MigrationInterface
{
	name = "AddEditLockHardDisableFeatureFlag1765200000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "v2_runtime_settings"
			ADD COLUMN IF NOT EXISTS "edit_lock_hard_disable_enabled" boolean NULL DEFAULT NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "v2_runtime_settings"
			DROP COLUMN IF EXISTS "edit_lock_hard_disable_enabled"
		`);
	}
}
