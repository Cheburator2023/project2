import { MigrationInterface, QueryRunner } from "typeorm";

export class ExtendV2TypicalWorkV41762400000000 implements MigrationInterface {
	name = "ExtendV2TypicalWorkV41762400000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_assignment (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				work_id uuid NOT NULL REFERENCES v2_typical_work(id) ON DELETE CASCADE,
				stream_executor varchar(120) NOT NULL,
				is_active boolean NOT NULL DEFAULT true,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_assignment UNIQUE (work_id, stream_executor)
			)
		`);

		await queryRunner.query(`
			INSERT INTO v2_typical_work_assignment (work_id, stream_executor)
			SELECT DISTINCT work_id, stream_executor FROM (
				SELECT work_id, stream_executor FROM v2_typical_work_norm
				UNION
				SELECT work_id, stream_executor FROM v2_typical_work_rule
				UNION
				SELECT work_id, stream_executor FROM v2_typical_work_labor_coefficient
			) streams
			ON CONFLICT (work_id, stream_executor) DO NOTHING
		`);

		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			ADD COLUMN IF NOT EXISTS value_codes jsonb,
			ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0
		`);

		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			ALTER COLUMN operator TYPE varchar(20)
		`);

		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_typical_work_labor_param (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				work_id uuid NOT NULL REFERENCES v2_typical_work(id) ON DELETE CASCADE,
				stream_executor varchar(120) NOT NULL,
				param_code varchar(120) NOT NULL,
				param_name varchar(255),
				kind varchar(20) NOT NULL DEFAULT 'by_value',
				any_of_value_codes jsonb,
				any_of_value_labels jsonb,
				coeff_on numeric(10, 2),
				coeff_off numeric(10, 2),
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_typical_work_labor_param UNIQUE (work_id, stream_executor, param_code)
			)
		`);

		await queryRunner.query(`
			INSERT INTO v2_typical_work_labor_param (work_id, stream_executor, param_code, param_name, kind)
			SELECT DISTINCT work_id, stream_executor, param_code, param_name, 'by_value'
			FROM v2_typical_work_labor_coefficient
			ON CONFLICT (work_id, stream_executor, param_code) DO NOTHING
		`);

		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config
			ADD COLUMN IF NOT EXISTS stream_executor varchar(120) NOT NULL DEFAULT ''
		`);

		await queryRunner.query(`
			DO $$
			BEGIN
				IF EXISTS (
					SELECT 1 FROM pg_constraint
					WHERE conname = 'uq_v2_typical_work_version_config'
				) THEN
					ALTER TABLE v2_typical_work_version_config
					DROP CONSTRAINT uq_v2_typical_work_version_config;
				END IF;
			END $$
		`);

		await queryRunner.query(`
			INSERT INTO v2_typical_work_version_config (
				template_version_id, work_id, stream_executor, formula, formula_text,
				rounding_mode, rounding_step, calculation_logic, created_at, updated_at
			)
			SELECT
				vc.template_version_id,
				vc.work_id,
				a.stream_executor,
				vc.formula,
				vc.formula_text,
				vc.rounding_mode,
				vc.rounding_step,
				vc.calculation_logic,
				now(),
				now()
			FROM v2_typical_work_version_config vc
			JOIN v2_typical_work_assignment a ON a.work_id = vc.work_id
			WHERE vc.stream_executor = ''
			  AND a.stream_executor <> ''
			ON CONFLICT DO NOTHING
		`);

		await queryRunner.query(`
			UPDATE v2_typical_work_version_config vc
			SET stream_executor = COALESCE(
				(
					SELECT stream_executor
					FROM v2_typical_work_assignment a
					WHERE a.work_id = vc.work_id
					ORDER BY a.stream_executor
					LIMIT 1
				),
				''
			)
			WHERE vc.stream_executor = ''
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_typical_work_version_config_stream
			ON v2_typical_work_version_config (template_version_id, work_id, stream_executor)
		`);

		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_v2_typical_work_assignment_work
			ON v2_typical_work_assignment(work_id)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS uq_v2_typical_work_version_config_stream`);
		await queryRunner.query(`
			DELETE FROM v2_typical_work_version_config WHERE stream_executor <> ''
		`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config DROP COLUMN IF EXISTS stream_executor
		`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_labor_param`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_rule
			DROP COLUMN IF EXISTS value_codes,
			DROP COLUMN IF EXISTS sort_order
		`);
		await queryRunner.query(`DROP TABLE IF EXISTS v2_typical_work_assignment`);
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_version_config
			ADD CONSTRAINT uq_v2_typical_work_version_config UNIQUE (template_version_id, work_id)
		`);
	}
}
