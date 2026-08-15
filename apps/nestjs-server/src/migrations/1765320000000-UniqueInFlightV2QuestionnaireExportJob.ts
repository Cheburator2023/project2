import type { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueInFlightV2QuestionnaireExportJob1765320000000
	implements MigrationInterface
{
	name = "UniqueInFlightV2QuestionnaireExportJob1765320000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			WITH ranked AS (
				SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
				FROM "v2_questionnaire_export_job"
				WHERE status IN ('pending', 'processing')
			)
			UPDATE "v2_questionnaire_export_job" AS job
			SET status = 'failed',
				error = 'Прервано: допускается только одна выгрузка',
				updated_at = NOW()
			FROM ranked
			WHERE job.id = ranked.id AND ranked.rn > 1
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "uniq_v2_q_export_job_in_flight"
			ON "v2_questionnaire_export_job" ((true))
			WHERE status IN ('pending', 'processing')
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS "uniq_v2_q_export_job_in_flight"
		`);
	}
}
