import { MigrationInterface, QueryRunner } from "typeorm";

const SUPERSPRINTS_TABLE = "kanban_board_supersprints";
const SPRINTS_TABLE = "kanban_board_sprints";
const STREAMS_TABLE = "kanban_board_streams";

export class CreateKanbanBoardPlanningTables1761200000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		if (!(await this.tableExists(queryRunner, SUPERSPRINTS_TABLE))) {
			await queryRunner.query(`
				CREATE TABLE ${SUPERSPRINTS_TABLE} (
					id varchar(26) PRIMARY KEY,
					code varchar(64) NOT NULL UNIQUE,
					name varchar(255) NOT NULL,
					description text,
					start_date date NOT NULL,
					end_date date,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
				)
			`);
		}

		if (!(await this.tableExists(queryRunner, SPRINTS_TABLE))) {
			await queryRunner.query(`
				CREATE TABLE ${SPRINTS_TABLE} (
					id varchar(26) PRIMARY KEY,
					supersprint_id varchar(26),
					code varchar(64) NOT NULL UNIQUE,
					name varchar(255) NOT NULL,
					description text,
					start_date date NOT NULL,
					end_date date,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					CONSTRAINT fk_kanban_board_sprints_supersprint
						FOREIGN KEY (supersprint_id) REFERENCES ${SUPERSPRINTS_TABLE}(id) ON DELETE SET NULL
				)
			`);
			await queryRunner.query(`
				CREATE INDEX IF NOT EXISTS idx_kanban_board_sprints_supersprint_id
				ON ${SPRINTS_TABLE}(supersprint_id)
			`);
		}

		if (!(await this.tableExists(queryRunner, STREAMS_TABLE))) {
			await queryRunner.query(`
				CREATE TABLE ${STREAMS_TABLE} (
					id varchar(26) PRIMARY KEY,
					code varchar(64) NOT NULL UNIQUE,
					name varchar(255) NOT NULL,
					description text,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
				)
			`);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		for (const table of [SPRINTS_TABLE, SUPERSPRINTS_TABLE, STREAMS_TABLE]) {
			if (await this.tableExists(queryRunner, table)) {
				await queryRunner.query(`DROP TABLE ${table}`);
			}
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
