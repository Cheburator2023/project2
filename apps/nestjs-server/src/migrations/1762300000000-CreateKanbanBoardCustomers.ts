import { MigrationInterface, QueryRunner } from "typeorm";

const CUSTOMERS_TABLE = "kanban_board_customers";

const STOCK_CUSTOMERS = [
	{ id: "01J000000000000000000016", code: "dadm", name: "ДАДМ" },
	{ id: "01J000000000000000000017", code: "umrv", name: "УМРВ" },
	{ id: "01J000000000000000000018", code: "ib", name: "ИБ" },
	{ id: "01J000000000000000000019", code: "dpsis", name: "ДПСИС" },
] as const;

export class CreateKanbanBoardCustomers1762300000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		const hasTable = await this.tableExists(queryRunner, CUSTOMERS_TABLE);
		if (!hasTable) {
			await queryRunner.query(`
				CREATE TABLE ${CUSTOMERS_TABLE} (
					id varchar(26) PRIMARY KEY,
					code varchar(64) NOT NULL UNIQUE,
					name varchar(255) NOT NULL,
					description text,
					created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
					updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
				)
			`);
		}

		for (const customer of STOCK_CUSTOMERS) {
			await queryRunner.query(
				`
					INSERT INTO ${CUSTOMERS_TABLE} (id, code, name)
					VALUES ($1, $2, $3)
					ON CONFLICT (code) DO NOTHING
				`,
				[customer.id, customer.code, customer.name],
			);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		const hasTable = await this.tableExists(queryRunner, CUSTOMERS_TABLE);
		if (hasTable) {
			await queryRunner.query(`DROP TABLE ${CUSTOMERS_TABLE}`);
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
