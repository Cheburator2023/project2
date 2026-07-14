import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddKanbanBoardTaskImageBlobs1763300000000
	implements MigrationInterface
{
	name = "AddKanbanBoardTaskImageBlobs1763300000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_task_images
			ADD COLUMN IF NOT EXISTS full_data bytea
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_task_images
			ADD COLUMN IF NOT EXISTS thumb_data bytea
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_task_images
			DROP COLUMN IF EXISTS thumb_data
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_task_images
			DROP COLUMN IF EXISTS full_data
		`);
	}
}
