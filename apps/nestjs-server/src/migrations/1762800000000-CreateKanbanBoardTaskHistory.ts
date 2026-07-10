import { MigrationInterface, QueryRunner } from "typeorm";

const TABLE = "kanban_board_task_history";

export class CreateKanbanBoardTaskHistory1762800000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		const exists = await this.tableExists(queryRunner, TABLE);
		if (exists) return;

		await queryRunner.query(`
			CREATE TABLE ${TABLE} (
				id varchar(26) PRIMARY KEY,
				board_id varchar(26) NOT NULL,
				task_id varchar(26) NOT NULL,
				task_key varchar(64) NOT NULL,
				task_title varchar(512) NOT NULL DEFAULT '',
				changes jsonb NOT NULL,
				created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
				created_by varchar(255)
			)
		`);

		await queryRunner.query(`
			CREATE INDEX idx_kanban_board_task_history_board_created
			ON ${TABLE} (board_id, created_at DESC)
		`);

		await queryRunner.query(`
			CREATE INDEX idx_kanban_board_task_history_task_created
			ON ${TABLE} (task_id, created_at DESC)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE}`);
	}

	private async tableExists(
		queryRunner: QueryRunner,
		table: string,
	): Promise<boolean> {
		const rows = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = 'public' AND table_name = $1
				LIMIT 1
			`,
			[table],
		);
		return rows.length > 0;
	}
}
