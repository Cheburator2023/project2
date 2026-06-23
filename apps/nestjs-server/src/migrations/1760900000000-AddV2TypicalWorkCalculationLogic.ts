import { MigrationInterface, QueryRunner } from "typeorm";

export class AddV2TypicalWorkCalculationLogic1760900000000
	implements MigrationInterface
{
	name = "AddV2TypicalWorkCalculationLogic1760900000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config
			ADD COLUMN IF NOT EXISTS calculation_logic jsonb
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config
			DROP COLUMN IF EXISTS calculation_logic
		`);
	}
}
