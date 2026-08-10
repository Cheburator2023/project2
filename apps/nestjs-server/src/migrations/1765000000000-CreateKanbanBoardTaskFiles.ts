import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKanbanBoardTaskFiles1765000000000
	implements MigrationInterface
{
	name = "CreateKanbanBoardTaskFiles1765000000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_task_files (
				id varchar(26) PRIMARY KEY,
				task_id varchar(26) NOT NULL,
				original_name varchar(255) NOT NULL,
				mime_type varchar(128) NOT NULL,
				byte_size int NOT NULL,
				storage_path varchar(512) NOT NULL,
				file_data bytea,
				created_at varchar(64) NOT NULL,
				CONSTRAINT fk_kanban_board_task_files_task
					FOREIGN KEY (task_id) REFERENCES kanban_board_tasks(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_task_files_task_id
			ON kanban_board_task_files (task_id)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_task_files`);
	}
}
