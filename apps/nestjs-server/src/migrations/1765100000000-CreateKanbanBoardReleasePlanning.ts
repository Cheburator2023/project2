import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateKanbanBoardReleasePlanning1765100000000
	implements MigrationInterface
{
	name = "CreateKanbanBoardReleasePlanning1765100000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_releases (
				id varchar(26) PRIMARY KEY,
				code varchar(64) NOT NULL UNIQUE,
				name varchar(255) NOT NULL,
				description text,
				status varchar(32) NOT NULL DEFAULT 'draft',
				supersprint_id varchar(26),
				sprint_id varchar(26),
				start_date date,
				end_date date,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT kanban_board_releases_status_check
					CHECK (status IN ('draft', 'planned', 'in_progress', 'done')),
				CONSTRAINT fk_kanban_board_releases_supersprint
					FOREIGN KEY (supersprint_id)
					REFERENCES kanban_board_supersprints(id) ON DELETE SET NULL,
				CONSTRAINT fk_kanban_board_releases_sprint
					FOREIGN KEY (sprint_id)
					REFERENCES kanban_board_sprints(id) ON DELETE SET NULL
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_releases_supersprint_id
			ON kanban_board_releases (supersprint_id)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_releases_sprint_id
			ON kanban_board_releases (sprint_id)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_release_themes (
				id varchar(26) PRIMARY KEY,
				release_id varchar(26) NOT NULL,
				name varchar(255) NOT NULL,
				color varchar(7) NOT NULL DEFAULT '#64748b',
				position int NOT NULL DEFAULT 0,
				CONSTRAINT fk_kanban_board_release_themes_release
					FOREIGN KEY (release_id)
					REFERENCES kanban_board_releases(id) ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_release_themes_release_id
			ON kanban_board_release_themes (release_id)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_release_tasks (
				release_id varchar(26) NOT NULL,
				task_id varchar(26) NOT NULL,
				theme_id varchar(26),
				position int NOT NULL DEFAULT 0,
				PRIMARY KEY (release_id, task_id),
				CONSTRAINT fk_kanban_board_release_tasks_release
					FOREIGN KEY (release_id)
					REFERENCES kanban_board_releases(id) ON DELETE CASCADE,
				CONSTRAINT fk_kanban_board_release_tasks_task
					FOREIGN KEY (task_id)
					REFERENCES kanban_board_tasks(id) ON DELETE CASCADE,
				CONSTRAINT fk_kanban_board_release_tasks_theme
					FOREIGN KEY (theme_id)
					REFERENCES kanban_board_release_themes(id) ON DELETE SET NULL
			)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_release_tasks_theme_id
			ON kanban_board_release_tasks (theme_id)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS kanban_board_plannings (
				id varchar(26) PRIMARY KEY,
				code varchar(64) NOT NULL UNIQUE,
				name varchar(255) NOT NULL,
				description text,
				release_id varchar(26) NOT NULL UNIQUE,
				layout_json jsonb,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_kanban_board_plannings_release
					FOREIGN KEY (release_id)
					REFERENCES kanban_board_releases(id) ON DELETE CASCADE
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_plannings`);
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_release_tasks`);
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_release_themes`);
		await queryRunner.query(`DROP TABLE IF EXISTS kanban_board_releases`);
	}
}
