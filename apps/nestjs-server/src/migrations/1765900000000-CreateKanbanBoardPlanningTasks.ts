import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Задача может быть в планировании без релиза.
 * Группа хранится здесь; релизы остаются в kanban_board_release_tasks.
 */
export class CreateKanbanBoardPlanningTasks1765900000000
	implements MigrationInterface
{
	name = "CreateKanbanBoardPlanningTasks1765900000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_planning_tasks (
				planning_id varchar(26) NOT NULL,
				task_id varchar(26) NOT NULL,
				theme_id varchar(26),
				position int NOT NULL DEFAULT 0,
				PRIMARY KEY (planning_id, task_id),
				CONSTRAINT fk_kanban_board_planning_tasks_planning
					FOREIGN KEY (planning_id)
					REFERENCES kanban_board_plannings(id) ON DELETE CASCADE,
				CONSTRAINT fk_kanban_board_planning_tasks_task
					FOREIGN KEY (task_id)
					REFERENCES kanban_board_tasks(id) ON DELETE CASCADE,
				CONSTRAINT fk_kanban_board_planning_tasks_theme
					FOREIGN KEY (theme_id)
					REFERENCES kanban_board_release_themes(id) ON DELETE SET NULL
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_planning_tasks_theme_id
			ON kanban_board_planning_tasks (theme_id)
		`);
		await queryRunner.query(`
			INSERT INTO kanban_board_planning_tasks (
				planning_id, task_id, theme_id, position
			)
			SELECT DISTINCT ON (release.planning_id, item.task_id)
				release.planning_id,
				item.task_id,
				item.theme_id,
				item.position
			FROM kanban_board_release_tasks AS item
			INNER JOIN kanban_board_releases AS release
				ON release.id = item.release_id
			WHERE release.planning_id IS NOT NULL
			ORDER BY release.planning_id, item.task_id, item.position ASC
			ON CONFLICT (planning_id, task_id) DO NOTHING
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP TABLE IF EXISTS kanban_board_planning_tasks`,
		);
	}
}
