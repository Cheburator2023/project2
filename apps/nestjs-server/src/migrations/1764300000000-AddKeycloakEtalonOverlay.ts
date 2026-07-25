import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddKeycloakEtalonOverlay1764300000000
	implements MigrationInterface
{
	name = "AddKeycloakEtalonOverlay1764300000000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			ADD COLUMN IF NOT EXISTS keycloak_etalon_overlay jsonb NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE v2_runtime_settings
			DROP COLUMN IF EXISTS keycloak_etalon_overlay
		`);
	}
}
