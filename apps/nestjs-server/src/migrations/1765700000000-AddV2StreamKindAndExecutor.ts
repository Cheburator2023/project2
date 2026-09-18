import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Единый каталог стримов: kind (model/supporting/platform) и isExecutor
 * для срезов формы implementationStream / поддерживающие стримы.
 */
export class AddV2StreamKindAndExecutor1765700000000
	implements MigrationInterface
{
	name = "AddV2StreamKindAndExecutor1765700000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE v2_stream
			SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
				'kind',
				CASE
					WHEN COALESCE((payload->>'isUmbrellaStream')::boolean, false)
						OR code = 'mdls'
					THEN 'model'
					WHEN COALESCE((payload->>'isModelStream')::boolean, false)
						OR code IN ('kmbkcb', 'rb', 'ptitpc', 'finmdl', 'rnd')
					THEN 'model'
					WHEN code = 'dadm' THEN 'platform'
					ELSE 'supporting'
				END,
				'isExecutor',
				CASE
					WHEN COALESCE((payload->>'isUmbrellaStream')::boolean, false)
						OR code = 'mdls'
					THEN false
					WHEN COALESCE((payload->>'isModelStream')::boolean, false)
						OR code IN ('kmbkcb', 'rb', 'ptitpc', 'finmdl', 'rnd')
					THEN true
					ELSE false
				END
			)
			WHERE payload IS NULL
			   OR payload->>'kind' IS NULL
			   OR payload->>'isExecutor' IS NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE v2_stream
			SET payload = payload - 'kind' - 'isExecutor'
			WHERE payload IS NOT NULL
		`);
	}
}
