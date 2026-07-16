import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypicalWorkAssignmentLaborArchCounts1763700000000
	implements MigrationInterface
{
	name = "AddTypicalWorkAssignmentLaborArchCounts1763700000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_assignment
			ADD COLUMN IF NOT EXISTS labor_arch_counts jsonb
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_assignment
			DROP COLUMN IF EXISTS labor_arch_counts
		`);
	}
}
