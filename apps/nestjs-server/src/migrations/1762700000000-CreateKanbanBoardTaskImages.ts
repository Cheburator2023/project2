import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKanbanBoardTaskImages1762700000000
	implements MigrationInterface
{
	name = "CreateKanbanBoardTaskImages1762700000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_task_images (
				id varchar(26) PRIMARY KEY,
				task_id varchar(26) NOT NULL,
				original_name varchar(255) NOT NULL,
				mime_type varchar(64) NOT NULL,
				width int NOT NULL,
				height int NOT NULL,
				full_byte_size int NOT NULL,
				thumb_byte_size int NOT NULL,
				full_path varchar(512) NOT NULL,
				thumb_path varchar(512) NOT NULL,
				created_at varchar(64) NOT NULL,
				CONSTRAINT fk_kanban_board_task_images_task
					FOREIGN KEY (task_id) REFERENCES kanban_board_tasks(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_task_images_task_id
			ON kanban_board_task_images (task_id)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_task_images`);
	}
}
