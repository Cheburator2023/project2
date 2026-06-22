import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2TypicalWorkTables1760700000000
	implements MigrationInterface
{
	name = "CreateV2TypicalWorkTables1760700000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				name varchar(255) NOT NULL,
				arch_component_type varchar(100) NOT NULL,
				work_type varchar(100),
				catalog_key varchar(160),
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_catalog_key UNIQUE (catalog_key)
			)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_norm (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				work_id uuid NOT NULL REFERENCES v2_typical_work(id) ON DELETE CASCADE,
				stream_executor varchar(120) NOT NULL,
				norm_value numeric(10, 2) NOT NULL,
				valid_from date NOT NULL,
				valid_to date,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now()
			)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_rule (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				work_id uuid NOT NULL REFERENCES v2_typical_work(id) ON DELETE CASCADE,
				stream_executor varchar(120) NOT NULL,
				param_code varchar(120) NOT NULL,
				param_name varchar(255),
				operator varchar(10) NOT NULL DEFAULT '=',
				value_code varchar(120),
				value_label varchar(255),
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now()
			)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_labor_coefficient (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				work_id uuid NOT NULL REFERENCES v2_typical_work(id) ON DELETE CASCADE,
				stream_executor varchar(120) NOT NULL,
				param_code varchar(120) NOT NULL,
				param_name varchar(255),
				value_code varchar(120),
				value_label varchar(255),
				coefficient numeric(10, 2) NOT NULL DEFAULT 1,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_labor UNIQUE (work_id, stream_executor, param_code, value_code)
			)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_version_config (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				template_version_id uuid NOT NULL REFERENCES v2_template_version(id) ON DELETE CASCADE,
				work_id uuid NOT NULL REFERENCES v2_typical_work(id) ON DELETE CASCADE,
				formula jsonb NOT NULL DEFAULT '[]'::jsonb,
				formula_text varchar(500),
				rounding_mode varchar(20) NOT NULL DEFAULT 'CEIL',
				rounding_step numeric(10, 4),
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_version_config UNIQUE (template_version_id, work_id)
			)
		`);

		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_arch_component",
			`CREATE INDEX idx_v2_typical_work_arch_component ON v2_typical_work(arch_component_type)`,
		);
		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_norm_work_stream",
			`CREATE INDEX idx_v2_typical_work_norm_work_stream ON v2_typical_work_norm(work_id, stream_executor)`,
		);
		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_rule_work_stream",
			`CREATE INDEX idx_v2_typical_work_rule_work_stream ON v2_typical_work_rule(work_id, stream_executor)`,
		);
		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_labor_work_stream",
			`CREATE INDEX idx_v2_typical_work_labor_work_stream ON v2_typical_work_labor_coefficient(work_id, stream_executor)`,
		);
		await this.ensureIndex(
			queryRunner,
			"idx_v2_typical_work_version_config_version",
			`CREATE INDEX idx_v2_typical_work_version_config_version ON v2_typical_work_version_config(template_version_id)`,
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
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_version_config`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_labor_coefficient`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_rule`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_norm`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work`);
	}
}
