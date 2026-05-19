import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeV2AuditTemplateIdNullable1760300000000
	implements MigrationInterface
{
	name = "MakeV2AuditTemplateIdNullable1760300000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			DROP CONSTRAINT IF EXISTS fk_v2_template_audit_template
		`);
		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			ALTER COLUMN template_id DROP NOT NULL
		`);
		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			ADD CONSTRAINT fk_v2_template_audit_template
			FOREIGN KEY (template_id) REFERENCES v2_template(id)
			ON DELETE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM v2_template_audit WHERE template_id IS NULL
		`);
		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			DROP CONSTRAINT IF EXISTS fk_v2_template_audit_template
		`);
		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			ALTER COLUMN template_id SET NOT NULL
		`);
		await queryRunner.query(`
			ALTER TABLE v2_template_audit
			ADD CONSTRAINT fk_v2_template_audit_template
			FOREIGN KEY (template_id) REFERENCES v2_template(id)
			ON DELETE CASCADE
		`);
	}
}
