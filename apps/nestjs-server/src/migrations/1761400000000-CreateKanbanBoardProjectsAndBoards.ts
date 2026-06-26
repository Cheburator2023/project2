import { MigrationInterface, QueryRunner } from "typeorm";

const PROJECTS_TABLE = "kanban_board_projects";
const BOARDS_TABLE = "kanban_boards";
const TASKS_TABLE = "kanban_board_tasks";

const STOCK_PROJECTS = [
	{
		id: "01J000000000000000000001",
		code: "sum",
		name: "SUM",
		description: "Стоковый проект SUM",
	},
	{
		id: "01J000000000000000000002",
		code: "sum-rm",
		name: "SUM-RM",
		description: "Стоковый проект SUM-RM",
	},
	{
		id: "01J000000000000000000003",
		code: "data_lineage",
		name: "Data Lineage",
		description: "Стоковый проект Data Lineage",
	},
	{
		id: "01J000000000000000000004",
		code: "smart_anketa",
		name: "Smart Anketa",
		description: "Стоковый проект Smart Anketa",
	},
] as const;

const STOCK_BOARDS = [
	{
		id: "01J000000000000000000011",
		projectId: "01J000000000000000000001",
		name: "Основная",
		slug: "main",
	},
	{
		id: "01J000000000000000000012",
		projectId: "01J000000000000000000002",
		name: "Основная",
		slug: "main",
	},
	{
		id: "01J000000000000000000013",
		projectId: "01J000000000000000000003",
		name: "Основная",
		slug: "main",
	},
	{
		id: "01J000000000000000000014",
		projectId: "01J000000000000000000004",
		name: "Основная",
		slug: "main",
	},
] as const;

export class CreateKanbanBoardProjectsAndBoards1761400000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasProjectsTable = await this.tableExists(queryRunner, PROJECTS_TABLE);
		if (!hasProjectsTable) {
			await queryRunner.query(`
				CREATE TABLE ${PROJECTS_TABLE} (
					id varchar(26) PRIMARY KEY,
					code varchar(64) NOT NULL UNIQUE,
					name varchar(255) NOT NULL,
					description text,
					is_stock boolean NOT NULL DEFAULT false,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
				)
			`);
		}

		const hasBoardsTable = await this.tableExists(queryRunner, BOARDS_TABLE);
		if (!hasBoardsTable) {
			await queryRunner.query(`
				CREATE TABLE ${BOARDS_TABLE} (
					id varchar(26) PRIMARY KEY,
					project_id varchar(26) NOT NULL,
					name varchar(255) NOT NULL,
					slug varchar(64) NOT NULL,
					description text,
					sort_order integer NOT NULL DEFAULT 0,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					CONSTRAINT fk_kanban_boards_project
						FOREIGN KEY (project_id) REFERENCES ${PROJECTS_TABLE}(id) ON DELETE CASCADE,
					CONSTRAINT uq_kanban_boards_project_slug UNIQUE (project_id, slug)
				)
			`);
			await queryRunner.query(`
				CREATE INDEX IF NOT EXISTS idx_kanban_boards_project_id
				ON ${BOARDS_TABLE}(project_id)
			`);
		}

		const hasBoardIdColumn = await this.columnExists(
			queryRunner,
			TASKS_TABLE,
			"board_id",
		);
		if (!hasBoardIdColumn) {
			await queryRunner.query(`
				ALTER TABLE ${TASKS_TABLE}
				ADD COLUMN IF NOT EXISTS board_id varchar(26)
			`);
			await queryRunner.query(`
				CREATE INDEX IF NOT EXISTS idx_kanban_board_tasks_board_id
				ON ${TASKS_TABLE}(board_id)
			`);
		}

		for (const project of STOCK_PROJECTS) {
			await queryRunner.query(
				`
				INSERT INTO ${PROJECTS_TABLE}
					(id, code, name, description, is_stock)
				VALUES ($1, $2, $3, $4, true)
				ON CONFLICT (code) DO NOTHING
			`,
				[project.id, project.code, project.name, project.description],
			);
		}

		for (const board of STOCK_BOARDS) {
			await queryRunner.query(
				`
				INSERT INTO ${BOARDS_TABLE}
					(id, project_id, name, slug, sort_order)
				VALUES ($1, $2, $3, $4, 0)
				ON CONFLICT (project_id, slug) DO NOTHING
			`,
				[board.id, board.projectId, board.name, board.slug],
			);
		}

		await queryRunner.query(`
			UPDATE ${TASKS_TABLE}
			SET board_id = '01J000000000000000000014'
			WHERE board_id IS NULL
		`);

		const boardIdNullable = await queryRunner.query(`
			SELECT is_nullable
			FROM information_schema.columns
			WHERE table_schema = ANY (current_schemas(false))
			  AND table_name = '${TASKS_TABLE}'
			  AND column_name = 'board_id'
		`);
		if (boardIdNullable[0]?.is_nullable === "YES") {
			await queryRunner.query(`
				ALTER TABLE ${TASKS_TABLE}
				ALTER COLUMN board_id SET NOT NULL
			`);
		}

		const hasBoardFk = await queryRunner.query(`
			SELECT 1
			FROM information_schema.table_constraints
			WHERE table_schema = ANY (current_schemas(false))
			  AND constraint_name = 'fk_kanban_board_tasks_board'
		`);
		if (hasBoardFk.length === 0) {
			await queryRunner.query(`
				ALTER TABLE ${TASKS_TABLE}
				ADD CONSTRAINT fk_kanban_board_tasks_board
				FOREIGN KEY (board_id) REFERENCES ${BOARDS_TABLE}(id) ON DELETE CASCADE
			`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		if (await this.tableExists(queryRunner, TASKS_TABLE)) {
			await queryRunner.query(`
				ALTER TABLE ${TASKS_TABLE}
				DROP CONSTRAINT IF EXISTS fk_kanban_board_tasks_board
			`);
			if (await this.columnExists(queryRunner, TASKS_TABLE, "board_id")) {
				await queryRunner.query(`
					ALTER TABLE ${TASKS_TABLE} DROP COLUMN board_id
				`);
			}
		}

		if (await this.tableExists(queryRunner, BOARDS_TABLE)) {
			await queryRunner.query(`DROP TABLE ${BOARDS_TABLE}`);
		}

		if (await this.tableExists(queryRunner, PROJECTS_TABLE)) {
			await queryRunner.query(`DROP TABLE ${PROJECTS_TABLE}`);
		}
	}

	private async tableExists(
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

	private async columnExists(
		queryRunner: QueryRunner,
		tableName: string,
		columnName: string,
	): Promise<boolean> {
		const rows = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = ANY (current_schemas(false))
				  AND table_name = $1
				  AND column_name = $2
			`,
			[tableName, columnName],
		);
		return rows.length > 0;
	}
}
