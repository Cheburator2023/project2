import { MigrationInterface, QueryRunner } from "typeorm";

const ASSIGNEES_TABLE = "kanban_board_assignees";
const SETTINGS_TABLE = "kanban_board_settings";
const SETTINGS_ID = "default";

export class AddKanbanBoardPlanningSettings1762000000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasAssignees = await this.tableExists(queryRunner, ASSIGNEES_TABLE);
		if (hasAssignees) {
			await queryRunner.query(`
				ALTER TABLE ${ASSIGNEES_TABLE}
				ADD COLUMN IF NOT EXISTS sprint_capacity_pd numeric(6, 2)
			`);
		}

		const hasSettings = await this.tableExists(queryRunner, SETTINGS_TABLE);
		if (!hasSettings) {
			await queryRunner.query(`
				CREATE TABLE ${SETTINGS_TABLE} (
					id varchar(32) PRIMARY KEY,
					default_sprint_capacity_pd numeric(6, 2) NOT NULL DEFAULT 9,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
				)
			`);
			await queryRunner.query(
				`
					INSERT INTO ${SETTINGS_TABLE} (id, default_sprint_capacity_pd)
					VALUES ($1, 9)
					ON CONFLICT (id) DO NOTHING
				`,
				[SETTINGS_ID],
			);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		if (await this.tableExists(queryRunner, SETTINGS_TABLE)) {
			await queryRunner.query(`DROP TABLE ${SETTINGS_TABLE}`);
		}
		if (await this.tableExists(queryRunner, ASSIGNEES_TABLE)) {
			await queryRunner.query(`
				ALTER TABLE ${ASSIGNEES_TABLE}
				DROP COLUMN IF EXISTS sprint_capacity_pd
			`);
		}
	}

	private async tableExists(
		queryRunner: QueryRunner,
		tableName: string,
	): Promise<boolean> {
		const rows = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = ANY (current_schemas(false))
				  AND table_name = $1
			`,
			[tableName],
		);
		return rows.length > 0;
	}
}
