import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandKanbanBoardReleaseStatuses1765600000000
	implements MigrationInterface
{
	name = "ExpandKanbanBoardReleaseStatuses1765600000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			DROP CONSTRAINT IF EXISTS kanban_board_releases_status_check
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			ADD CONSTRAINT kanban_board_releases_status_check
			CHECK (status IN (
				'draft',
				'planned',
				'in_progress',
				'ready',
				'done',
				'cancelled',
				'archived'
			))
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE kanban_board_releases
			SET status = 'in_progress'
			WHERE status IN ('ready')
		`);
		await queryRunner.query(`
			UPDATE kanban_board_releases
			SET status = 'done'
			WHERE status IN ('cancelled', 'archived')
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			DROP CONSTRAINT IF EXISTS kanban_board_releases_status_check
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			ADD CONSTRAINT kanban_board_releases_status_check
			CHECK (status IN ('draft', 'planned', 'in_progress', 'done'))
		`);
	}
}
