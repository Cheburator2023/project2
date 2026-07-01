import { MigrationInterface, QueryRunner } from "typeorm";

const TASKS_TABLE = "kanban_board_tasks";
const BOARDS_TABLE = "kanban_boards";
const PROJECTS_TABLE = "kanban_board_projects";

const CODE_TABLES = [
	{ table: PROJECTS_TABLE, column: "code" },
	{ table: BOARDS_TABLE, column: "slug" },
	{ table: "kanban_board_assignees", column: "code" },
	{ table: "kanban_board_customers", column: "code" },
	{ table: "kanban_board_supersprints", column: "code" },
	{ table: "kanban_board_sprints", column: "code" },
	{ table: "kanban_board_streams", column: "code" },
] as const;

export class AddKanbanBoardTaskNumbersAndUppercaseCodes1762600000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasProjectId = await this.columnExists(
			queryRunner,
			TASKS_TABLE,
			"project_id",
		);
		if (!hasProjectId) {
			await queryRunner.query(`
				ALTER TABLE ${TASKS_TABLE}
				ADD COLUMN project_id varchar(26),
				ADD COLUMN task_number integer
			`);
		}

		await queryRunner.query(`
			UPDATE ${TASKS_TABLE} AS task
			SET project_id = board.project_id
			FROM ${BOARDS_TABLE} AS board
			WHERE task.board_id = board.id
			  AND task.project_id IS NULL
		`);

		// Номер задачи — строго уникален в рамках project_id.
		// backlogNumber только задаёт порядок при раздаче, не копируется напрямую
		// (иначе дубликаты backlogNumber ломают unique index).
		await queryRunner.query(`
			WITH ranked AS (
				SELECT
					task.id,
					ROW_NUMBER() OVER (
						PARTITION BY task.project_id
						ORDER BY
							CASE
								WHEN (task.content->>'backlogNumber') ~ '^[0-9]+$'
									AND (task.content->>'backlogNumber')::int > 0
								THEN (task.content->>'backlogNumber')::int
								ELSE 2147483647
							END,
							task.updated_at ASC,
							task.id ASC
					)::int AS next_number
				FROM ${TASKS_TABLE} AS task
				WHERE task.project_id IS NOT NULL
			)
			UPDATE ${TASKS_TABLE} AS task
			SET task_number = ranked.next_number
			FROM ranked
			WHERE task.id = ranked.id
		`);

		await queryRunner.query(`
			ALTER TABLE ${TASKS_TABLE}
			ALTER COLUMN project_id SET NOT NULL,
			ALTER COLUMN task_number SET NOT NULL
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS uq_kanban_board_tasks_project_task_number
			ON ${TASKS_TABLE} (project_id, task_number)
		`);

		for (const { table, column } of CODE_TABLES) {
			if (await this.tableExists(queryRunner, table)) {
				await queryRunner.query(`
					UPDATE ${table}
					SET ${column} = UPPER(TRIM(${column}))
					WHERE ${column} <> UPPER(TRIM(${column}))
				`);
			}
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS uq_kanban_board_tasks_project_task_number
		`);
		if (
			await this.columnExists(queryRunner, TASKS_TABLE, "project_id")
		) {
			await queryRunner.query(`
				ALTER TABLE ${TASKS_TABLE}
				DROP COLUMN IF EXISTS project_id,
				DROP COLUMN IF EXISTS task_number
			`);
		}
	}

	private async tableExists(
		queryRunner: QueryRunner,
		table: string,
	): Promise<boolean> {
		const rows = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = 'public' AND table_name = $1
				LIMIT 1
			`,
			[table],
		);
		return rows.length > 0;
	}

	private async columnExists(
		queryRunner: QueryRunner,
		table: string,
		column: string,
	): Promise<boolean> {
		const rows = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = 'public'
				  AND table_name = $1
				  AND column_name = $2
				LIMIT 1
			`,
			[table, column],
		);
		return rows.length > 0;
	}
}
