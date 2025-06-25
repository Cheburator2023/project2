import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration created: 19-06-2025
 * Description: Creates calculation table structure
 */

export class CreateCalculationTable1718651234567 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
      CREATE TABLE calculation (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        questionnaire_data jsonb NOT NULL,
        final_coefficient float NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
		await queryRunner.query(`
      CREATE INDEX idx_calculation_created_at ON calculation(created_at)
    `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX idx_calculation_created_at`);
		await queryRunner.query(`DROP TABLE calculation`);
	}
}
