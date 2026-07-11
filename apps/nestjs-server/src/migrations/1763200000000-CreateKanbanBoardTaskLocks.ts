import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKanbanBoardTaskLocks1763200000000
	implements MigrationInterface
{
	name = "CreateKanbanBoardTaskLocks1763200000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_task_locks (
				task_id varchar(26) PRIMARY KEY,
				locked_by_label varchar(255) NOT NULL,
				locked_by_user_id varchar(128),
				expires_at timestamptz NOT NULL,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_kanban_board_task_locks_task
					FOREIGN KEY (task_id) REFERENCES kanban_board_tasks(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_task_locks_expires_at
			ON kanban_board_task_locks (expires_at)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_task_locks`);
	}
}
