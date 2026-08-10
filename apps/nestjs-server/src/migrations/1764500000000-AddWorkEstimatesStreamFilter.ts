import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkEstimatesStreamFilter1764500000000
	implements MigrationInterface
{
	name = "AddWorkEstimatesStreamFilter1764500000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			ADD COLUMN IF NOT EXISTS work_estimates_stream_filter_enabled boolean NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			DROP COLUMN IF EXISTS work_estimates_stream_filter_enabled
		`);
	}
}
