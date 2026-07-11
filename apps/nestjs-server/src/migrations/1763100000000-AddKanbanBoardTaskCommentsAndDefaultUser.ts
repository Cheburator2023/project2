import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddKanbanBoardTaskCommentsAndDefaultUser1763100000000
	implements MigrationInterface
{
	name = "AddKanbanBoardTaskCommentsAndDefaultUser1763100000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_settings
			ADD COLUMN IF NOT EXISTS default_current_user_assignee_name varchar(255)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_task_comments (
				id varchar(26) PRIMARY KEY,
				task_id varchar(26) NOT NULL,
				body text NOT NULL,
				author_name varchar(255) NOT NULL,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_kanban_board_task_comments_task
					FOREIGN KEY (task_id) REFERENCES kanban_board_tasks(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_task_comments_task_id
			ON kanban_board_task_comments (task_id, created_at)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_task_comments`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_settings
			DROP COLUMN IF EXISTS default_current_user_assignee_name
		`);
	}
}
