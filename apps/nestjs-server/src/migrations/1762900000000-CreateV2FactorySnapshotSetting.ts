import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateV2FactorySnapshotSetting1762900000000
	implements MigrationInterface
{
	name = "CreateV2FactorySnapshotSetting1762900000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE v2_factory_snapshot_setting (
				id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
				source varchar(20) NOT NULL DEFAULT 'builtin',
				template_id uuid REFERENCES v2_template(id) ON DELETE SET NULL,
				version_id uuid REFERENCES v2_template_version(id) ON DELETE SET NULL,
				updated_at timestamptz NOT NULL DEFAULT now(),
				updated_by varchar(255)
			)
		`);

		await queryRunner.query(`
			INSERT INTO v2_factory_snapshot_setting (id, source)
			VALUES (1, 'builtin')
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS v2_factory_snapshot_setting`);
	}
}
