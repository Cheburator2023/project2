import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Переносит content.sprintOutcome в конец content.description
 * (блок «Ожидаемый результат спринта») и удаляет ключ из JSON.
 */
export class MergeKanbanSprintOutcomeIntoDescription1764800000000
	implements MigrationInterface
{
	name = "MergeKanbanSprintOutcomeIntoDescription1764800000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE kanban_board_tasks
			SET content = CASE
				WHEN COALESCE(btrim(content->>'sprintOutcome'), '') = ''
					THEN content - 'sprintOutcome'
				ELSE jsonb_set(
					content - 'sprintOutcome',
					'{description}',
					to_jsonb(
						CASE
							WHEN COALESCE(btrim(content->>'description'), '') = ''
								THEN '## Ожидаемый результат спринта' || E'\\n' || btrim(content->>'sprintOutcome')
							ELSE btrim(content->>'description')
								|| E'\\n\\n## Ожидаемый результат спринта' || E'\\n'
								|| btrim(content->>'sprintOutcome')
						END
					),
					true
				)
			END
			WHERE content ? 'sprintOutcome'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Обратный разбор markdown ненадёжен — оставляем данные в description.
		void queryRunner;
	}
}
