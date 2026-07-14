import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddV2QuestionnaireComments1763200000000
	implements MigrationInterface
{
	name = "AddV2QuestionnaireComments1763200000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_questionnaire_comments (
				id varchar(26) PRIMARY KEY,
				questionnaire_id uuid NOT NULL,
				parent_comment_id varchar(26),
				body text NOT NULL,
				author_name varchar(255) NOT NULL,
				is_anketa_author boolean NOT NULL DEFAULT false,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_v2_questionnaire_comments_questionnaire
					FOREIGN KEY (questionnaire_id) REFERENCES v2_questionnaire(id) ON DELETE CASCADE,
				CONSTRAINT fk_v2_questionnaire_comments_parent
					FOREIGN KEY (parent_comment_id) REFERENCES v2_questionnaire_comments(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_v2_questionnaire_comments_questionnaire_id
			ON v2_questionnaire_comments (questionnaire_id, created_at)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS v2_questionnaire_comments`);
	}
}
