import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migration created: 19-06-2025
 * Description: Creates calculation table structure
 */

export class CreateCalculationTable1718651234567 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS calculation (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "calcName" varchar(255) NOT NULL,
                "rfd" varchar(255),
                "streamExecutor" varchar(255),
                "department" jsonb,
                "customerName" varchar(255),
                "comment" varchar(255),
                "questionnaireData" jsonb NOT NULL,
                "finalCoefficient" float NOT NULL,
                "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "author" varchar(255)
                "status" varchar(50),
                "seriesId" varchar(100),
                "version" integer,
                "parentId" varchar(255)
                )
        `);

		await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_created_at ON calculation("createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_status ON calculation("status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_series_id ON calculation("seriesId")
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX idx_calculation_created_at`);
		await queryRunner.query(`DROP TABLE calculation`);
        await queryRunner.query(`DROP INDEX idx_calculation_status`);
        await queryRunner.query(`DROP INDEX idx_calculation_series_id`);
	}
}
