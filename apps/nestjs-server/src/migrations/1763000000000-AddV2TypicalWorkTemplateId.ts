import { MigrationInterface, QueryRunner } from "typeorm";

export class AddV2TypicalWorkTemplateId1763000000000
	implements MigrationInterface
{
	name = "AddV2TypicalWorkTemplateId1763000000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work
			ADD COLUMN IF NOT EXISTS template_id uuid NULL
				REFERENCES v2_template(id) ON DELETE CASCADE
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_v2_typical_work_template_id
			ON v2_typical_work (template_id)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_v2_typical_work_template_id
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work
			DROP COLUMN IF EXISTS template_id
		`);
	}
}
