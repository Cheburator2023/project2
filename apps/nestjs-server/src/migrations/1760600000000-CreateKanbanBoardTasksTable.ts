import { MigrationInterface, QueryRunner } from "typeorm";

const KANBAN_BOARD_TASKS_TABLE = "kanban_board_tasks";
const LEGACY_TASKS_TABLE = "tasks";
const INDEXES = {
	parentId: "idx_kanban_board_tasks_parent_id",
	origin: "idx_kanban_board_tasks_origin",
} as const;
const LEGACY_INDEXES = {
	parentId: "idx_tasks_parent_id",
	origin: "idx_tasks_origin",
} as const;

const COLUMN_ALTERS = [
	"ADD COLUMN IF NOT EXISTS id varchar(26)",
	"ADD COLUMN IF NOT EXISTS parent_id varchar(64) NOT NULL DEFAULT 'backlog'",
	"ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0",
	"ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb",
	"ADD COLUMN IF NOT EXISTS origin varchar(255) NOT NULL DEFAULT 'local-dev'",
	"ADD COLUMN IF NOT EXISTS updated_at varchar(64) NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'",
] as const;

async function loadTableColumns(
	queryRunner: QueryRunner,
	tableName: string,
): Promise<Set<string>> {
	const rows = await queryRunner.query(
		`
			SELECT column_name
			FROM information_schema.columns
			WHERE table_schema = ANY (current_schemas(false))
			  AND table_name = $1
		`,
		[tableName],
	);
	return new Set(
		rows.map((row: { column_name: string }) => row.column_name),
	);
}

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

export class CreateKanbanBoardTasksTable1760600000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		let hasKanbanBoardTasksTable = await tableExists(
			queryRunner,
			KANBAN_BOARD_TASKS_TABLE,
		);
		const hasLegacyTasksTable = await tableExists(
			queryRunner,
			LEGACY_TASKS_TABLE,
		);

		if (!hasKanbanBoardTasksTable && hasLegacyTasksTable) {
			await queryRunner.query(`
				ALTER TABLE ${LEGACY_TASKS_TABLE} RENAME TO ${KANBAN_BOARD_TASKS_TABLE}
			`);
			hasKanbanBoardTasksTable = true;

			for (const [legacyIndex, nextIndex] of [
				[LEGACY_INDEXES.parentId, INDEXES.parentId],
				[LEGACY_INDEXES.origin, INDEXES.origin],
			] as const) {
				const indexExists = await queryRunner.query(
					`
						SELECT 1
						FROM pg_indexes
						WHERE schemaname = ANY (current_schemas(false))
						  AND indexname = $1
					`,
					[legacyIndex],
				);
				if (indexExists.length > 0) {
					await queryRunner.query(`
						ALTER INDEX ${legacyIndex} RENAME TO ${nextIndex}
					`);
				}
			}
		}

		if (!hasKanbanBoardTasksTable) {
			await queryRunner.query(`
				CREATE TABLE ${KANBAN_BOARD_TASKS_TABLE} (
					id varchar(26) PRIMARY KEY,
					parent_id varchar(64) NOT NULL,
					position integer NOT NULL,
					content jsonb NOT NULL,
					origin varchar(255) NOT NULL,
					updated_at varchar(64) NOT NULL
				)
			`);
		} else {
			await this.ensureColumns(queryRunner);
		}

		const existingIndexes = await queryRunner.query(
			`
				SELECT indexname
				FROM pg_indexes
				WHERE schemaname = ANY (current_schemas(false))
				  AND tablename = $1
				  AND indexname = ANY ($2)
			`,
			[KANBAN_BOARD_TASKS_TABLE, [INDEXES.parentId, INDEXES.origin]],
		);
		const indexNames = new Set(
			existingIndexes.map((row: { indexname: string }) => row.indexname),
		);

		if (!indexNames.has(INDEXES.parentId)) {
			await queryRunner.query(`
				CREATE INDEX ${INDEXES.parentId} ON ${KANBAN_BOARD_TASKS_TABLE}(parent_id)
			`);
		}

		if (!indexNames.has(INDEXES.origin)) {
			await queryRunner.query(`
				CREATE INDEX ${INDEXES.origin} ON ${KANBAN_BOARD_TASKS_TABLE}(origin)
			`);
		}
	}

	private async ensureColumns(queryRunner: QueryRunner): Promise<void> {
		const existing = await loadTableColumns(
			queryRunner,
			KANBAN_BOARD_TASKS_TABLE,
		);

		for (const alter of COLUMN_ALTERS) {
			const columnName = alter.match(/ADD COLUMN IF NOT EXISTS (\w+)/)?.[1];
			if (columnName && existing.has(columnName)) {
				continue;
			}
			await queryRunner.query(`
				ALTER TABLE ${KANBAN_BOARD_TASKS_TABLE} ${alter}
			`);
		}

		const primaryKey = await queryRunner.query(`
			SELECT 1
			FROM information_schema.table_constraints
			WHERE table_schema = ANY (current_schemas(false))
			  AND table_name = '${KANBAN_BOARD_TASKS_TABLE}'
			  AND constraint_type = 'PRIMARY KEY'
		`);
		if (primaryKey.length === 0) {
			await queryRunner.query(`
				ALTER TABLE ${KANBAN_BOARD_TASKS_TABLE}
				ADD CONSTRAINT pk_kanban_board_tasks PRIMARY KEY (id)
			`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const hasKanbanBoardTasksTable = await tableExists(
			queryRunner,
			KANBAN_BOARD_TASKS_TABLE,
		);
		if (!hasKanbanBoardTasksTable) {
			return;
		}

		await queryRunner.query(`DROP INDEX IF EXISTS ${INDEXES.parentId}`);
		await queryRunner.query(`DROP INDEX IF EXISTS ${INDEXES.origin}`);
		await queryRunner.query(`DROP TABLE ${KANBAN_BOARD_TASKS_TABLE}`);
	}
}
