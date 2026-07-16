import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypicalWorkRuleArchCountTrigger1763600000000
	implements MigrationInterface
{
	name = "AddTypicalWorkRuleArchCountTrigger1763600000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_assignment
			ADD COLUMN IF NOT EXISTS trigger_arch_count_kind varchar(40),
			ADD COLUMN IF NOT EXISTS trigger_arch_count_steps jsonb,
			ADD COLUMN IF NOT EXISTS trigger_arch_count_combinator varchar(3) NOT NULL DEFAULT 'and',
			ADD COLUMN IF NOT EXISTS trigger_mode varchar(20) NOT NULL DEFAULT 'simple',
			ADD COLUMN IF NOT EXISTS trigger_formula jsonb
		`);

		await queryRunner.query(`
			DO $$
			BEGIN
				IF EXISTS (
					SELECT 1 FROM information_schema.columns
					WHERE table_name = 'v2_typical_work_rule'
						AND column_name = 'arch_count_kind'
				) THEN
					UPDATE v2_typical_work_assignment a
					SET
						trigger_arch_count_kind = src.arch_count_kind,
						trigger_arch_count_steps = src.arch_count_steps,
						trigger_arch_count_combinator = COALESCE(src.arch_count_combinator, 'and')
					FROM (
						SELECT DISTINCT ON (work_id, stream_executor)
							work_id,
							stream_executor,
							arch_count_kind,
							arch_count_steps,
							arch_count_combinator
						FROM v2_typical_work_rule
						WHERE arch_count_kind IS NOT NULL
						ORDER BY work_id, stream_executor, sort_order ASC
					) src
					WHERE a.work_id = src.work_id
						AND a.stream_executor = src.stream_executor
						AND a.trigger_arch_count_kind IS NULL;

					ALTER TABLE v2_typical_work_rule
					DROP COLUMN IF EXISTS arch_count_kind,
					DROP COLUMN IF EXISTS arch_count_steps,
					DROP COLUMN IF EXISTS arch_count_combinator;
				END IF;
			END $$;
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_typical_work_assignment
			DROP COLUMN IF EXISTS trigger_arch_count_kind,
			DROP COLUMN IF EXISTS trigger_arch_count_steps,
			DROP COLUMN IF EXISTS trigger_arch_count_combinator,
			DROP COLUMN IF EXISTS trigger_mode,
			DROP COLUMN IF EXISTS trigger_formula
		`);
	}
}
