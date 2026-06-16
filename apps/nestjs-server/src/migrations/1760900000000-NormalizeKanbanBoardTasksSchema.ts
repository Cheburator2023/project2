import { MigrationInterface, QueryRunner } from "typeorm";

const TABLE = "kanban_board_tasks";
const PK_NAME = "pk_kanban_board_tasks";
const EXPECTED_COLUMNS = new Set([
	"id",
	"board_id",
	"parent_id",
	"position",
	"content",
	"origin",
	"updated_at",
]);

async function tableExists(
	queryRunner: QueryRunner,
	tableName: string,
): Promise<boolean> {
	const rows = await queryRunner.query(
		`
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = ANY (current_schemas(false))
			  AND table_name = $1
		`,
		[tableName],
	);
	return rows.length > 0;
}

async function loadColumns(
	queryRunner: QueryRunner,
	tableName: string,
): Promise<string[]> {
	const rows = await queryRunner.query(
		`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = ANY (current_schemas(false))
			  AND table_name = $1
			ORDER BY ordinal_position
		`,
		[tableName],
	);
	return rows.map((row: { column_name: string }) => row.column_name);
}

export class NormalizeKanbanBoardTasksSchema1760900000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		if (!(await tableExists(queryRunner, TABLE))) {
			return;
		}

		let columns = await loadColumns(queryRunner, TABLE);

		if (columns.includes("task_id") && !columns.includes("id")) {
			await queryRunner.query(`
				ALTER TABLE ${TABLE} RENAME COLUMN task_id TO id
			`);
			columns = await loadColumns(queryRunner, TABLE);
		}

		if (columns.includes("task_id") && columns.includes("id")) {
			await queryRunner.query(`
				UPDATE ${TABLE}
				SET id = task_id::varchar(26)
				WHERE (id IS NULL OR btrim(id) = '') AND task_id IS NOT NULL
			`);
		}

		columns = await loadColumns(queryRunner, TABLE);
		for (const column of columns) {
			if (EXPECTED_COLUMNS.has(column)) {
				continue;
			}
			await queryRunner.query(`
				ALTER TABLE ${TABLE} DROP COLUMN IF EXISTS "${column}" CASCADE
			`);
		}

		const columnAlters = [
			"ADD COLUMN IF NOT EXISTS id varchar(26)",
			"ADD COLUMN IF NOT EXISTS board_id varchar(26)",
			"ADD COLUMN IF NOT EXISTS parent_id varchar(64) NOT NULL DEFAULT 'backlog'",
			"ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0",
			"ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb",
			"ADD COLUMN IF NOT EXISTS origin varchar(255) NOT NULL DEFAULT 'local-dev'",
			"ADD COLUMN IF NOT EXISTS updated_at varchar(64) NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'",
		] as const;

		const existing = new Set(await loadColumns(queryRunner, TABLE));
		for (const alter of columnAlters) {
			const columnName = alter.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
			if (columnName && existing.has(columnName)) {
				continue;
			}
			await queryRunner.query(`
				ALTER TABLE ${TABLE} ${alter}
			`);
		}

		await queryRunner.query(`
			UPDATE ${TABLE}
			SET id = substr(replace(gen_random_uuid()::text, '-', ''), 1, 26)
			WHERE id IS NULL OR btrim(id) = ''
		`);

		await queryRunner.query(`
			ALTER TABLE ${TABLE}
			ALTER COLUMN id SET NOT NULL
		`);

		const primaryKey = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.table_constraints
				WHERE table_schema = ANY (current_schemas(false))
				  AND table_name = $1
				  AND constraint_type = 'PRIMARY KEY'
			`,
			[TABLE],
		);
		if (primaryKey.length === 0) {
			await queryRunner.query(`
				ALTER TABLE ${TABLE}
				ADD CONSTRAINT ${PK_NAME} PRIMARY KEY (id)
			`);
		}
	}

	public async down(_queryRunner: QueryRunner): Promise<void> {
		// Не восстанавливаем legacy-колонки.
	}
}
