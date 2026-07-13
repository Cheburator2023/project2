import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypicalWorkSchemaFieldUid1763400000000
	implements MigrationInterface
{
	name = "AddTypicalWorkSchemaFieldUid1763400000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			ADD COLUMN IF NOT EXISTS schema_field_uid varchar(80) NULL
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_labor_param
			ADD COLUMN IF NOT EXISTS schema_field_uid varchar(80) NULL
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_v2_typical_work_rule_schema_field_uid
			ON v2_typical_work_rule (schema_field_uid)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_v2_typical_work_labor_param_schema_field_uid
			ON v2_typical_work_labor_param (schema_field_uid)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_v2_typical_work_labor_param_schema_field_uid
		`);
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_v2_typical_work_rule_schema_field_uid
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_labor_param
			DROP COLUMN IF EXISTS schema_field_uid
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			DROP COLUMN IF EXISTS schema_field_uid
		`);
	}
}
