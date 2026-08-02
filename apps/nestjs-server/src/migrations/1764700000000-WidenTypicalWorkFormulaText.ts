import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * После schema-sync `formula_text` собирается из paramName с `@ code|slug|alias`
 * и легко превышает varchar(500). Bulk apply / post-seed reconcile тогда падают
 * с 22001, а редактор схемы вечно предлагает «обновить типовые работы».
 */
export class WidenTypicalWorkFormulaText1764700000000
	implements MigrationInterface
{
	name = "WidenTypicalWorkFormulaText1764700000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config
			ALTER COLUMN formula_text TYPE text
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			ALTER COLUMN param_name TYPE varchar(1000)
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_labor_param
			ALTER COLUMN param_name TYPE varchar(1000)
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_labor_coefficient
			ALTER COLUMN param_name TYPE varchar(1000)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config
			ALTER COLUMN formula_text TYPE varchar(500)
			USING left(formula_text, 500)
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			ALTER COLUMN param_name TYPE varchar(255)
			USING left(param_name, 255)
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_labor_param
			ALTER COLUMN param_name TYPE varchar(255)
			USING left(param_name, 255)
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_labor_coefficient
			ALTER COLUMN param_name TYPE varchar(255)
			USING left(param_name, 255)
		`);
	}
}
