import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * FK edit-lock → v2_questionnaire мог быть создан при другом search_path
 * (public.v2_questionnaire пустая, данные в schema TypeORM). INSERT occupancy
 * тогда всегда 23503, хотя HTTP форму уже отдаёт.
 */
export class RetargetV2QuestionnaireEditLockFk1765340000000
	implements MigrationInterface
{
	name = "RetargetV2QuestionnaireEditLockFk1765340000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DO $$
			DECLARE
				r RECORD;
				q_reg regclass;
			BEGIN
				FOR r IN
					SELECT nsp.nspname AS schema_name, rel.relname AS table_name, con.conname
					FROM pg_constraint con
					JOIN pg_class rel ON rel.oid = con.conrelid
					JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
					WHERE con.contype = 'f'
						AND rel.relname = 'v2_questionnaire_edit_locks'
				LOOP
					EXECUTE format(
						'ALTER TABLE %I.%I DROP CONSTRAINT %I',
						r.schema_name,
						r.table_name,
						r.conname
					);
				END LOOP;

				SELECT c.oid::regclass INTO q_reg
				FROM pg_class c
				JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE c.relname = 'v2_questionnaire'
					AND n.nspname = ANY (current_schemas(false))
				LIMIT 1;

				IF q_reg IS NOT NULL THEN
					EXECUTE format(
						'ALTER TABLE v2_questionnaire_edit_locks
						 ADD CONSTRAINT fk_v2_questionnaire_edit_locks_questionnaire
						 FOREIGN KEY (questionnaire_id) REFERENCES %s(id) ON DELETE CASCADE',
						q_reg
					);
				END IF;
			END $$;
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_questionnaire_edit_locks
			DROP CONSTRAINT IF EXISTS fk_v2_questionnaire_edit_locks_questionnaire
		`);
		await queryRunner.query(`
			ALTER TABLE v2_questionnaire_edit_locks
			ADD CONSTRAINT fk_v2_questionnaire_edit_locks_questionnaire
			FOREIGN KEY (questionnaire_id) REFERENCES v2_questionnaire(id) ON DELETE CASCADE
		`);
	}
}
