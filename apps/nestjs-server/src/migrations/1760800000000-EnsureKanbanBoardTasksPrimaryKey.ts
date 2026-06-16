import { MigrationInterface, QueryRunner } from "typeorm";

const TABLE = "kanban_board_tasks";
const PK_NAME = "pk_kanban_board_tasks";

export class EnsureKanbanBoardTasksPrimaryKey1760800000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		const table = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.tables
				WHERE table_schema = ANY (current_schemas(false))
				  AND table_name = $1
			`,
			[TABLE],
		);
		if (table.length === 0) {
			return;
		}

		const primaryKey = await queryRunner.query(
			`
				SELECT 1
				FROM information_schema.table_constraints
				WHERE table_schema = ANY (current_schemas(false))
				  AND table_name = $1
				  AND constraint_type = 'PRIMARY KEY'
			`,
			[TABLE],
		);
		if (primaryKey.length > 0) {
			return;
		}

		await queryRunner.query(`
			UPDATE ${TABLE}
			SET id = substr(replace(gen_random_uuid()::text, '-', ''), 1, 26)
			WHERE id IS NULL
		`);

		await queryRunner.query(`
			ALTER TABLE ${TABLE}
			ALTER COLUMN id SET NOT NULL
		`);

		await queryRunner.query(`
			ALTER TABLE ${TABLE}
			ADD CONSTRAINT ${PK_NAME} PRIMARY KEY (id)
		`);
	}

	public async down(_queryRunner: QueryRunner): Promise<void> {
		// Не снимаем PK при откате — таблица могла существовать без него до миграции.
	}
}
