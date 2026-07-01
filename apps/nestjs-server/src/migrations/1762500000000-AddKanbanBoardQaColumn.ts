import { MigrationInterface, QueryRunner } from "typeorm";

const COLUMNS_TABLE = "kanban_board_columns";
const BOARDS_TABLE = "kanban_boards";

const QA_COLUMN = {
	id: "qa",
	title: "QA",
	color: "#0891b2",
	sortOrder: 4,
} as const;

export class AddKanbanBoardQaColumn1762500000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`
				UPDATE ${COLUMNS_TABLE}
				SET sort_order = 5
				WHERE id = 'done' AND sort_order = 4
			`,
		);

		const boards = await queryRunner.query(`
			SELECT id FROM ${BOARDS_TABLE}
		`);
		for (const board of boards as Array<{ id: string }>) {
			await queryRunner.query(
				`
					INSERT INTO ${COLUMNS_TABLE} (board_id, id, title, color, sort_order)
					VALUES ($1::varchar(26), $2::varchar(26), $3::varchar(255), $4::varchar(7), $5::integer)
					ON CONFLICT (board_id, id) DO NOTHING
				`,
				[
					board.id,
					QA_COLUMN.id,
					QA_COLUMN.title,
					QA_COLUMN.color,
					QA_COLUMN.sortOrder,
				],
			);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DELETE FROM ${COLUMNS_TABLE} WHERE id = $1`,
			[QA_COLUMN.id],
		);
		await queryRunner.query(
			`
				UPDATE ${COLUMNS_TABLE}
				SET sort_order = 4
				WHERE id = 'done' AND sort_order = 5
			`,
		);
	}
}
