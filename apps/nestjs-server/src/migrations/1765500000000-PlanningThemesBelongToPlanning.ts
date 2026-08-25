import { MigrationInterface, QueryRunner } from "typeorm";

export class PlanningThemesBelongToPlanning1765500000000
	implements MigrationInterface
{
	name = "PlanningThemesBelongToPlanning1765500000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			ADD COLUMN IF NOT EXISTS planning_id varchar(26)
		`);
		await queryRunner.query(`
			UPDATE kanban_board_release_themes AS theme
			SET planning_id = release.planning_id
			FROM kanban_board_releases AS release
			WHERE theme.release_id = release.id
				AND theme.planning_id IS NULL
		`);
		await queryRunner.query(`
			DELETE FROM kanban_board_release_themes
			WHERE planning_id IS NULL
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			ALTER COLUMN planning_id SET NOT NULL
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			DROP CONSTRAINT IF EXISTS fk_kanban_board_release_themes_release
		`);
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_kanban_board_release_themes_release_id
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			DROP COLUMN IF EXISTS release_id
		`);
		await queryRunner.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'fk_kanban_board_release_themes_planning'
				) THEN
					ALTER TABLE kanban_board_release_themes
					ADD CONSTRAINT fk_kanban_board_release_themes_planning
					FOREIGN KEY (planning_id)
					REFERENCES kanban_board_plannings(id) ON DELETE CASCADE;
				END IF;
			END $$
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_release_themes_planning_id
			ON kanban_board_release_themes (planning_id)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			ADD COLUMN IF NOT EXISTS release_id varchar(26)
		`);
		await queryRunner.query(`
			UPDATE kanban_board_release_themes AS theme
			SET release_id = release.id
			FROM (
				SELECT DISTINCT ON (planning_id) id, planning_id
				FROM kanban_board_releases
				WHERE planning_id IS NOT NULL
				ORDER BY planning_id, created_at ASC
			) AS release
			WHERE release.planning_id = theme.planning_id
				AND theme.release_id IS NULL
		`);
		await queryRunner.query(`
			DELETE FROM kanban_board_release_themes
			WHERE release_id IS NULL
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			ALTER COLUMN release_id SET NOT NULL
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			DROP CONSTRAINT IF EXISTS fk_kanban_board_release_themes_planning
		`);
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_kanban_board_release_themes_planning_id
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_release_themes
			DROP COLUMN IF EXISTS planning_id
		`);
		await queryRunner.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'fk_kanban_board_release_themes_release'
				) THEN
					ALTER TABLE kanban_board_release_themes
					ADD CONSTRAINT fk_kanban_board_release_themes_release
					FOREIGN KEY (release_id)
					REFERENCES kanban_board_releases(id) ON DELETE CASCADE;
				END IF;
			END $$
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_release_themes_release_id
			ON kanban_board_release_themes (release_id)
		`);
	}
}
