import { MigrationInterface, QueryRunner } from "typeorm";

const BOARDS_TABLE = "kanban_boards";
const COLUMNS_TABLE = "kanban_board_columns";

const HEAP_BOARD = {
	id: "01J000000000000000000015",
	projectId: "01J000000000000000000004",
	name: "Куча",
	slug: "heap",
	sortOrder: 999,
} as const;

const DEFAULT_COLUMNS = [
	{ id: "backlog", title: "Бэклог", color: "#64748b", sortOrder: 0 },
	{ id: "todo", title: "К выполнению", color: "#2563eb", sortOrder: 1 },
	{ id: "in_progress", title: "В работе", color: "#d97706", sortOrder: 2 },
	{ id: "review", title: "Ревью", color: "#7c3aed", sortOrder: 3 },
	{ id: "done", title: "Готово", color: "#16a34a", sortOrder: 4 },
] as const;

export class CreateKanbanBoardHeap1762200000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`
				INSERT INTO ${BOARDS_TABLE}
					(id, project_id, name, slug, sort_order)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (project_id, slug) DO NOTHING
			`,
			[
				HEAP_BOARD.id,
				HEAP_BOARD.projectId,
				HEAP_BOARD.name,
				HEAP_BOARD.slug,
				HEAP_BOARD.sortOrder,
			],
		);

		for (const column of DEFAULT_COLUMNS) {
			await queryRunner.query(
				`
					INSERT INTO ${COLUMNS_TABLE} (board_id, id, title, color, sort_order)
					VALUES ($1::varchar(26), $2::varchar(26), $3::varchar(255), $4::varchar(7), $5::integer)
					ON CONFLICT (board_id, id) DO NOTHING
				`,
				[
					HEAP_BOARD.id,
					column.id,
					column.title,
					column.color,
					column.sortOrder,
				],
			);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM ${COLUMNS_TABLE} WHERE board_id = $1`, [
			HEAP_BOARD.id,
		]);
		await queryRunner.query(`DELETE FROM ${BOARDS_TABLE} WHERE id = $1`, [
			HEAP_BOARD.id,
		]);
	}
}
