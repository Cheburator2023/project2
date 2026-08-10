import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKanbanCreatedByAndTaskCreatedAt1764100000000
	implements MigrationInterface
{
	name = "AddKanbanCreatedByAndTaskCreatedAt1764100000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			ADD COLUMN IF NOT EXISTS created_at varchar(64)
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			ADD COLUMN IF NOT EXISTS created_by varchar(255)
		`);
		await queryRunner.query(`
			UPDATE kanban_board_tasks
			SET created_at = updated_at
			WHERE created_at IS NULL
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			ALTER COLUMN created_at SET NOT NULL
		`);

		await queryRunner.query(`
			ALTER TABLE kanban_boards
			ADD COLUMN IF NOT EXISTS created_by varchar(255)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_boards
			DROP COLUMN IF EXISTS created_by
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			DROP COLUMN IF EXISTS created_by
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_tasks
			DROP COLUMN IF EXISTS created_at
		`);
	}
}
