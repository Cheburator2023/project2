import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2RuntimeSettings1764000000000 implements MigrationInterface {
	name = "CreateV2RuntimeSettings1764000000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE v2_runtime_settings (
				id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
				stream_filter_enabled boolean NULL,
				updated_at timestamptz NOT NULL DEFAULT now(),
				updated_by varchar(255)
			)
		`);

		await queryRunner.query(`
			INSERT INTO v2_runtime_settings (id, stream_filter_enabled)
			VALUES (1, NULL)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS v2_runtime_settings`);
	}
}
