import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2QuestionnaireTable1760400000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TYPE v2_questionnaire_status_enum AS ENUM ('active', 'archived')
		`);

		await queryRunner.query(`
			CREATE TABLE v2_questionnaire (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				calc_name varchar(255) NOT NULL DEFAULT 'Новая анкета',
				status v2_questionnaire_status_enum NOT NULL DEFAULT 'active',
				version varchar(20) NOT NULL DEFAULT '1',
				series_id varchar(50) NOT NULL,
				parent_questionnaire_id uuid,
				readable_id varchar(100),
				template_id uuid NOT NULL,
				bound_template_version_id uuid NOT NULL,
				form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
				final_coefficient double precision,
				author varchar(255),
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_v2_questionnaire_template
					FOREIGN KEY (template_id) REFERENCES v2_template(id),
				CONSTRAINT fk_v2_questionnaire_bound_version
					FOREIGN KEY (bound_template_version_id) REFERENCES v2_template_version(id),
				CONSTRAINT fk_v2_questionnaire_parent
					FOREIGN KEY (parent_questionnaire_id) REFERENCES v2_questionnaire(id)
			)
		`);

		await queryRunner.query(`
			CREATE INDEX idx_v2_questionnaire_series_id ON v2_questionnaire(series_id)
		`);
		await queryRunner.query(`
			CREATE INDEX idx_v2_questionnaire_template_id ON v2_questionnaire(template_id)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS v2_questionnaire`);
		await queryRunner.query(`DROP TYPE IF EXISTS v2_questionnaire_status_enum`);
	}
}
