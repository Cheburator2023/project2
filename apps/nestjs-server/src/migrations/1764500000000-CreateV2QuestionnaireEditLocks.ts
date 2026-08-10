import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2QuestionnaireEditLocks1764500000000
	implements MigrationInterface
{
	name = "CreateV2QuestionnaireEditLocks1764500000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_questionnaire_edit_locks (
				questionnaire_id uuid PRIMARY KEY,
				locked_by_label varchar(255) NOT NULL,
				locked_by_user_id varchar(128),
				expires_at timestamptz NOT NULL,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_v2_questionnaire_edit_locks_questionnaire
					FOREIGN KEY (questionnaire_id) REFERENCES v2_questionnaire(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_v2_questionnaire_edit_locks_expires_at
			ON v2_questionnaire_edit_locks (expires_at)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS v2_questionnaire_edit_locks`);
	}
}
