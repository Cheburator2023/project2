import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Реестр стримов выносится из словаря формы в `v2_stream`.
 * Словарь `v2.generalInfo.implementationStream` остаётся только для select анкеты
 * (после миграции — 5 модельных кодов; seed дочистит/досоздаст).
 */
export class CreateV2StreamTable1764600000000 implements MigrationInterface {
	name = "CreateV2StreamTable1764600000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS v2_stream (
				id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				code varchar(100) NOT NULL,
				label varchar(500) NOT NULL,
				"order" integer NOT NULL DEFAULT 0,
				is_active boolean NOT NULL DEFAULT true,
				payload jsonb NULL,
				created_at timestamptz NOT NULL DEFAULT now(),
				updated_at timestamptz NOT NULL DEFAULT now(),
				CONSTRAINT uq_v2_stream_code UNIQUE (code)
			)
		`);

		await queryRunner.query(`
			INSERT INTO v2_stream (id, code, label, "order", is_active, payload, created_at, updated_at)
			SELECT
				i.id,
				i.code,
				i.label,
				i."order",
				i.is_active,
				i.payload,
				now(),
				now()
			FROM v2_dictionary_item i
			INNER JOIN v2_dictionary d ON d.id = i.dictionary_id
			WHERE d.code = 'v2.generalInfo.implementationStream'
			ON CONFLICT (code) DO NOTHING
		`);

		const modelCodes = ["kmbkcb", "rb", "ptitpc", "finmdl", "rnd"];
		await queryRunner.query(
			`
			DELETE FROM v2_dictionary_item i
			USING v2_dictionary d
			WHERE i.dictionary_id = d.id
			  AND d.code = 'v2.generalInfo.implementationStream'
			  AND i.code <> ALL($1::varchar[])
			`,
			[modelCodes],
		);

		await queryRunner.query(
			`
			UPDATE v2_dictionary_item i
			SET is_active = true,
			    payload = COALESCE(i.payload, '{}'::jsonb) || '{"storeCode": true}'::jsonb
			FROM v2_dictionary d
			WHERE i.dictionary_id = d.id
			  AND d.code = 'v2.generalInfo.implementationStream'
			  AND i.code = ANY($1::varchar[])
			`,
			[modelCodes],
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Обратный перенос в словарь не делаем — данные реестра останутся в v2_stream
		// до явного DROP (чтобы не затереть form-словарь полным каталогом).
		await queryRunner.query(`DROP TABLE IF EXISTS v2_stream`);
	}
}
