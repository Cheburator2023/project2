import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddV2QuestionnaireInactiveStatus1764200000000
	implements MigrationInterface
{
	name = "AddV2QuestionnaireInactiveStatus1764200000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TYPE v2_questionnaire_status_enum ADD VALUE IF NOT EXISTS 'inactive'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		/** Postgres не умеет удалять значение из ENUM без пересоздания типа. */
		void queryRunner;
	}
}
