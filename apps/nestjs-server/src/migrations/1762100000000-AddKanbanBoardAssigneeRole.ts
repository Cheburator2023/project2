import { MigrationInterface, QueryRunner } from "typeorm";

const ASSIGNEES_TABLE = "kanban_board_assignees";

export class AddKanbanBoardAssigneeRole1762100000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasTable = await this.tableExists(queryRunner, ASSIGNEES_TABLE);
		if (!hasTable) return;

		const hasColumn = await this.columnExists(queryRunner, ASSIGNEES_TABLE, "role");
		if (!hasColumn) {
			await queryRunner.query(`
				ALTER TABLE ${ASSIGNEES_TABLE}
				ADD COLUMN role varchar(32)
			`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const hasTable = await this.tableExists(queryRunner, ASSIGNEES_TABLE);
		if (!hasTable) return;

		const hasColumn = await this.columnExists(queryRunner, ASSIGNEES_TABLE, "role");
		if (hasColumn) {
			await queryRunner.query(`
				ALTER TABLE ${ASSIGNEES_TABLE}
				DROP COLUMN role
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

	private async columnExists(
		queryRunner: QueryRunner,
		tableName: string,
		columnName: string,
	): Promise<boolean> {
		const rows = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.columns
				WHERE table_schema = ANY (current_schemas(false))
				  AND table_name = $1
				  AND column_name = $2
			`,
			[tableName, columnName],
		);
		return rows.length > 0;
	}
}
