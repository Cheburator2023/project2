import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Трекер вынесен в отдельный сервис. Таблицы kanban_* в этой БД больше не используются.
 */
export class DropTrackerTables1766100000000 implements MigrationInterface {
	name = "DropTrackerTables1766100000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP TABLE IF EXISTS
				kanban_board_planning_tasks,
				kanban_board_release_tasks,
				kanban_board_release_themes,
				kanban_board_task_comments,
				kanban_board_task_files,
				kanban_board_task_images,
				kanban_board_task_history,
				kanban_board_task_locks,
				kanban_board_push_subscriptions,
				kanban_board_tasks,
				kanban_board_columns,
				kanban_board_releases,
				kanban_board_plannings,
				kanban_boards,
				kanban_board_sprints,
				kanban_board_supersprints,
				kanban_board_streams,
				kanban_board_assignees,
				kanban_board_customers,
				kanban_board_projects,
				kanban_board_settings
			CASCADE
		`);
	}

	public async down(): Promise<void> {
		/* tracker schema lives in a separate service */
	}
}
