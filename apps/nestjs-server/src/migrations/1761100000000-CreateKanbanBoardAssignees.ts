import { MigrationInterface, QueryRunner } from "typeorm";

const ASSIGNEES_TABLE = "kanban_board_assignees";

export class CreateKanbanBoardAssignees1761100000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasTable = await this.tableExists(queryRunner, ASSIGNEES_TABLE);
		if (!hasTable) {
			await queryRunner.query(`
				CREATE TABLE ${ASSIGNEES_TABLE} (
					id varchar(26) PRIMARY KEY,
					code varchar(64) NOT NULL UNIQUE,
					name varchar(255) NOT NULL,
					email varchar(255),
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
				)
			`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const hasTable = await this.tableExists(queryRunner, ASSIGNEES_TABLE);
		if (hasTable) {
			await queryRunner.query(`DROP TABLE ${ASSIGNEES_TABLE}`);
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
