import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2TypicalWorkParamCatalog1760800000000
	implements MigrationInterface
{
	name = "CreateV2TypicalWorkParamCatalog1760800000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_param (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				code varchar(120) NOT NULL,
				name varchar(255) NOT NULL,
				description text,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_param_code UNIQUE (code)
			)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_param_value (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				param_id uuid NOT NULL REFERENCES v2_typical_work_param(id) ON DELETE CASCADE,
				code varchar(120) NOT NULL,
				label varchar(500) NOT NULL,
				coefficient numeric(10, 2),
				sort_order integer NOT NULL DEFAULT 0,
				valid_from date NOT NULL,
				valid_to date,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_param_value_code UNIQUE (param_id, code)
			)
		`);

		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_param_value_param",
			`CREATE INDEX idx_v2_typical_work_param_value_param ON v2_typical_work_param_value(param_id, sort_order)`,
		);
		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_param_value_active",
			`CREATE INDEX idx_v2_typical_work_param_value_active ON v2_typical_work_param_value(param_id, valid_from, valid_to)`,
		);
	}

	private async ensureIndex(
		queryRunner: QueryRunner,
		indexName: string,
		createSql: string,
	): Promise<void> {
		const indexes = await queryRunner.query(
			`
			SELECT indexname FROM pg_indexes
			WHERE indexname = $1
		`,
			[indexName],
		);

		if (indexes.length === 0) {
			await queryRunner.query(createSql);
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_param_value`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_param`);
	}
}
