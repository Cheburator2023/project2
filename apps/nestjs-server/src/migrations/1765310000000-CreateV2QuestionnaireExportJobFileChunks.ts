import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2QuestionnaireExportJobFileChunks1765310000000
	implements MigrationInterface
{
	name = "CreateV2QuestionnaireExportJobFileChunks1765310000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "v2_questionnaire_export_job_file_chunk" (
				"job_id" uuid NOT NULL
					REFERENCES "v2_questionnaire_export_job"("id") ON DELETE CASCADE,
				"chunk_index" integer NOT NULL,
				"content" bytea NOT NULL,
				PRIMARY KEY ("job_id", "chunk_index")
			)
		`);
		await queryRunner.query(`
			ALTER TABLE "v2_questionnaire_export_job_file"
			DROP COLUMN IF EXISTS "content"
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "v2_questionnaire_export_job_file"
			ADD COLUMN IF NOT EXISTS "content" bytea
		`);
		await queryRunner.query(
			`DROP TABLE IF EXISTS "v2_questionnaire_export_job_file_chunk"`,
		);
	}
}
