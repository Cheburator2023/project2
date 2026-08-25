import { MigrationInterface, QueryRunner } from "typeorm";

export class PlanningManyReleasesAndImageVersions1765400000000
	implements MigrationInterface
{
	name = "PlanningManyReleasesAndImageVersions1765400000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			ADD COLUMN IF NOT EXISTS planning_id varchar(26)
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			ADD COLUMN IF NOT EXISTS image_versions jsonb NOT NULL DEFAULT '{}'::jsonb
		`);
		await queryRunner.query(`
			UPDATE kanban_board_releases AS release
			SET planning_id = planning.id
			FROM kanban_board_plannings AS planning
			WHERE planning.release_id = release.id
				AND release.planning_id IS NULL
		`);
		await queryRunner.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'fk_kanban_board_releases_planning'
				) THEN
					ALTER TABLE kanban_board_releases
					ADD CONSTRAINT fk_kanban_board_releases_planning
					FOREIGN KEY (planning_id)
					REFERENCES kanban_board_plannings(id) ON DELETE SET NULL;
				END IF;
			END $$
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_kanban_board_releases_planning_id
			ON kanban_board_releases (planning_id)
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_plannings
			DROP COLUMN IF EXISTS release_id
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE kanban_board_plannings
			ADD COLUMN IF NOT EXISTS release_id varchar(26)
		`);
		await queryRunner.query(`
			UPDATE kanban_board_plannings AS planning
			SET release_id = release.id
			FROM (
				SELECT DISTINCT ON (planning_id) id, planning_id
				FROM kanban_board_releases
				WHERE planning_id IS NOT NULL
				ORDER BY planning_id, created_at ASC
			) AS release
			WHERE release.planning_id = planning.id
		`);
		await queryRunner.query(`
			DELETE FROM kanban_board_plannings WHERE release_id IS NULL
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_plannings
			ALTER COLUMN release_id SET NOT NULL
		`);
		await queryRunner.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'kanban_board_plannings_release_id_key'
				) THEN
					ALTER TABLE kanban_board_plannings
					ADD CONSTRAINT kanban_board_plannings_release_id_key UNIQUE (release_id);
				END IF;
			END $$
		`);
		await queryRunner.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'fk_kanban_board_plannings_release'
				) THEN
					ALTER TABLE kanban_board_plannings
					ADD CONSTRAINT fk_kanban_board_plannings_release
					FOREIGN KEY (release_id)
					REFERENCES kanban_board_releases(id) ON DELETE CASCADE;
				END IF;
			END $$
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			DROP CONSTRAINT IF EXISTS fk_kanban_board_releases_planning
		`);
		await queryRunner.query(`
			DROP INDEX IF EXISTS idx_kanban_board_releases_planning_id
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			DROP COLUMN IF EXISTS planning_id
		`);
		await queryRunner.query(`
			ALTER TABLE kanban_board_releases
			DROP COLUMN IF EXISTS image_versions
		`);
	}
}
