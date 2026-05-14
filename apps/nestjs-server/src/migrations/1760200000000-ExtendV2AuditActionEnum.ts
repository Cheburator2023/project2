import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Расширяет перечень действий аудита V2 (в исходной миграции не хватало version.deleted).
 */
export class ExtendV2AuditActionEnum1760200000000 implements MigrationInterface {
	name = "ExtendV2AuditActionEnum1760200000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DO $$ BEGIN
				ALTER TYPE v2_template_audit_action_enum ADD VALUE 'version.deleted';
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$;
		`);
		await queryRunner.query(`
			DO $$ BEGIN
				ALTER TYPE v2_template_audit_action_enum ADD VALUE 'version.reset_to_default';
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$;
		`);
		await queryRunner.query(`
			DO $$ BEGIN
				ALTER TYPE v2_template_audit_action_enum ADD VALUE 'version.activated_as_current';
			EXCEPTION
				WHEN duplicate_object THEN NULL;
			END $$;
		`);
	}

	public async down(): Promise<void> {
		// Удаление значений из ENUM в PostgreSQL не поддерживается без пересоздания типа.
	}
}
