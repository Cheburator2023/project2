import { MigrationInterface, QueryRunner } from "typeorm";

const COLUMNS_TABLE = "kanban_board_columns";
const BOARDS_TABLE = "kanban_boards";

const DEFAULT_COLUMNS = [
	{ id: "backlog", title: "Бэклог", color: "#64748b", sortOrder: 0 },
	{ id: "todo", title: "К выполнению", color: "#2563eb", sortOrder: 1 },
	{ id: "in_progress", title: "В работе", color: "#d97706", sortOrder: 2 },
	{ id: "review", title: "Ревью", color: "#7c3aed", sortOrder: 3 },
	{ id: "done", title: "Готово", color: "#16a34a", sortOrder: 4 },
] as const;

export class CreateKanbanBoardColumns1761700000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasColumnsTable = await this.tableExists(queryRunner, COLUMNS_TABLE);
		if (!hasColumnsTable) {
			await queryRunner.query(`
				CREATE TABLE ${COLUMNS_TABLE} (
					board_id varchar(26) NOT NULL,
					id varchar(26) NOT NULL,
					title varchar(255) NOT NULL,
					color varchar(7) NOT NULL DEFAULT '#94a3b8',
					sort_order integer NOT NULL DEFAULT 0,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					PRIMARY KEY (board_id, id),
					CONSTRAINT fk_kanban_board_columns_board
						FOREIGN KEY (board_id) REFERENCES ${BOARDS_TABLE}(id) ON DELETE CASCADE
				)
			`);
		}

		const boards = await queryRunner.query(`
			SELECT id FROM ${BOARDS_TABLE}
		`);
		for (const board of boards as Array<{ id: string }>) {
			for (const column of DEFAULT_COLUMNS) {
				await queryRunner.query(
					`
						INSERT INTO ${COLUMNS_TABLE} (board_id, id, title, color, sort_order)
						VALUES ($1::varchar(26), $2::varchar(26), $3::varchar(255), $4::varchar(7), $5::integer)
						ON CONFLICT (board_id, id) DO NOTHING
					`,
					[board.id, column.id, column.title, column.color, column.sortOrder],
				);
			}
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const hasColumnsTable = await this.tableExists(queryRunner, COLUMNS_TABLE);
		if (hasColumnsTable) {
			await queryRunner.query(`DROP TABLE ${COLUMNS_TABLE}`);
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
}
