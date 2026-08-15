import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2QuestionnaireExportJobs1765300000000
	implements MigrationInterface
{
	name = "CreateV2QuestionnaireExportJobs1765300000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "v2_questionnaire_export_job" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				"status" varchar(16) NOT NULL DEFAULT 'pending',
				"progress" integer NOT NULL DEFAULT 0,
				"total" integer NULL,
				"error" text NULL,
				"requested_ids" jsonb NULL,
				"user_groups" jsonb NULL,
				"created_by" varchar(255) NULL,
				"filename" varchar(255) NULL,
				"created_at" timestamptz NOT NULL DEFAULT now(),
				"updated_at" timestamptz NOT NULL DEFAULT now()
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_v2_q_export_job_status"
			ON "v2_questionnaire_export_job" ("status")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_v2_q_export_job_created_by"
			ON "v2_questionnaire_export_job" ("created_by")
		`);
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "v2_questionnaire_export_job_file" (
				"job_id" uuid PRIMARY KEY
					REFERENCES "v2_questionnaire_export_job"("id") ON DELETE CASCADE,
				"filename" varchar(255) NOT NULL,
				"content" bytea NOT NULL,
				"size_bytes" integer NOT NULL
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP TABLE IF EXISTS "v2_questionnaire_export_job_file"`,
		);
		await queryRunner.query(
			`DROP TABLE IF EXISTS "v2_questionnaire_export_job"`,
		);
	}
}
