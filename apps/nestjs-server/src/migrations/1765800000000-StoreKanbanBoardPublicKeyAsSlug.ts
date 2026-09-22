import type { MigrationInterface, QueryRunner } from "typeorm";

const BOARDS_TABLE = "kanban_boards";
const PROJECTS_TABLE = "kanban_board_projects";

/**
 * Раньше slug был суффиксом (HEAP), публичный ключ — PROJECT-SLUG.
 * Теперь slug хранит публичный ключ как есть (MAIN → код проекта).
 */
export class StoreKanbanBoardPublicKeyAsSlug1765800000000
	implements MigrationInterface
{
	name = "StoreKanbanBoardPublicKeyAsSlug1765800000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE ${BOARDS_TABLE} AS board
			SET slug = UPPER(TRIM(
				CASE
					WHEN UPPER(TRIM(board.slug)) IN ('MAIN', '')
						OR UPPER(TRIM(board.slug)) = UPPER(TRIM(project.code))
					THEN project.code
					WHEN UPPER(TRIM(board.slug)) LIKE UPPER(TRIM(project.code)) || '-%'
					THEN board.slug
					ELSE project.code || '-' || board.slug
				END
			))
			FROM ${PROJECTS_TABLE} AS project
			WHERE project.id = board.project_id
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE ${BOARDS_TABLE} AS board
			SET slug = CASE
				WHEN UPPER(TRIM(board.slug)) = UPPER(TRIM(project.code))
				THEN 'MAIN'
				WHEN UPPER(TRIM(board.slug)) LIKE UPPER(TRIM(project.code)) || '-%'
				THEN SUBSTRING(board.slug FROM LENGTH(TRIM(project.code)) + 2)
				ELSE board.slug
			END
			FROM ${PROJECTS_TABLE} AS project
			WHERE project.id = board.project_id
		`);
	}
}
