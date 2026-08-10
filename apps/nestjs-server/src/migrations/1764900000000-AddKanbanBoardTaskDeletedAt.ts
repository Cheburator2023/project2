import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKanbanBoardTaskDeletedAt1764900000000
	implements MigrationInterface
{
	name = "AddKanbanBoardTaskDeletedAt1764900000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			ADD COLUMN IF NOT EXISTS deleted_at varchar(64)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_tasks_deleted_at
			ON kanban_board_tasks (deleted_at)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_kanban_board_tasks_deleted_at
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			DROP COLUMN IF EXISTS deleted_at
		`);
	}
}
