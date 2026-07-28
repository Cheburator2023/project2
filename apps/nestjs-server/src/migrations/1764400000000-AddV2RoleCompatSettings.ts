import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddV2RoleCompatSettings1764400000000
	implements MigrationInterface
{
	name = "AddV2RoleCompatSettings1764400000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			ADD COLUMN IF NOT EXISTS admin_it_as_appadmin boolean NULL
		`);
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			ADD COLUMN IF NOT EXISTS allow_nested_lead_groups boolean NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			DROP COLUMN IF EXISTS allow_nested_lead_groups
		`);
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			DROP COLUMN IF EXISTS admin_it_as_appadmin
		`);
	}
}
