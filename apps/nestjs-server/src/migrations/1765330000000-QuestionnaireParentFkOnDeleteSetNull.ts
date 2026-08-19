import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Новые версии анкеты (ДАДМ) ссылаются на родителя через parent_questionnaire_id.
 * Без ON DELETE SET NULL удаление черновика-родителя валит FK и рвёт HTTP-запрос.
 */
export class QuestionnaireParentFkOnDeleteSetNull1765330000000
	implements MigrationInterface
{
	name = "QuestionnaireParentFkOnDeleteSetNull1765330000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DO $$
			DECLARE
				r RECORD;
			BEGIN
				FOR r IN
					SELECT con.conname
					FROM pg_constraint con
					JOIN pg_class rel ON rel.oid = con.conrelid
					JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
					WHERE con.contype = 'f'
						AND rel.relname = 'v2_questionnaire'
						AND pg_get_constraintdef(con.oid) ILIKE '%parent_questionnaire_id%'
				LOOP
					EXECUTE format(
						'ALTER TABLE v2_questionnaire DROP CONSTRAINT %I',
						r.conname
					);
				END LOOP;
			END $$;
		`);
		await queryRunner.query(`
			ALTER TABLE v2_questionnaire
			ADD CONSTRAINT fk_v2_questionnaire_parent
			FOREIGN KEY (parent_questionnaire_id)
			REFERENCES v2_questionnaire(id)
			ON DELETE SET NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_questionnaire
			DROP CONSTRAINT IF EXISTS fk_v2_questionnaire_parent
		`);
		await queryRunner.query(`
			ALTER TABLE v2_questionnaire
			ADD CONSTRAINT fk_v2_questionnaire_parent
			FOREIGN KEY (parent_questionnaire_id)
			REFERENCES v2_questionnaire(id)
		`);
	}
}
