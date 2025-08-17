import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVersioningFieldsFixed1755251569000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE calculation 
            DROP COLUMN IF EXISTS "version",
            DROP COLUMN IF EXISTS "status"
        `);

		await queryRunner.query(`
            CREATE TYPE "calculation_status_enum" AS ENUM ('Активная', 'Архивная')
        `);

		await queryRunner.query(`
            ALTER TABLE calculation 
            ADD COLUMN "status" "calculation_status_enum" DEFAULT 'Активная',
            ADD COLUMN "version" varchar(20) DEFAULT '1.0.0',
            ADD COLUMN "seriesId" varchar(50),
            ADD COLUMN "parentCalcId" uuid,
            ADD COLUMN "readableId" varchar(100)
        `);

        await queryRunner.query(`
            UPDATE calculation
            SET
                "status" = 'Активная',
                "version" = '1.0.0'
            WHERE "status" IS NULL OR "version" IS NULL
        `);

		await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_status ON calculation("status")
        `);

		await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_series_id ON calculation("seriesId")
        `);

		await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_parent_calc_id ON calculation("parentCalcId")
        `);

		await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_calculation_readable_id ON calculation("readableId")
        `);

		await queryRunner.query(`
            ALTER TABLE calculation 
            ADD CONSTRAINT fk_calculation_parent 
            FOREIGN KEY ("parentCalcId") REFERENCES calculation("id")
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE calculation DROP CONSTRAINT IF EXISTS fk_calculation_parent
        `);

		await queryRunner.query(`
            DROP INDEX IF EXISTS idx_calculation_readable_id
        `);

		await queryRunner.query(`
            DROP INDEX IF EXISTS idx_calculation_parent_calc_id
        `);

		await queryRunner.query(`
            DROP INDEX IF EXISTS idx_calculation_series_id
        `);

		await queryRunner.query(`
            DROP INDEX IF EXISTS idx_calculation_status
        `);

		await queryRunner.query(`
            ALTER TABLE calculation 
            DROP COLUMN IF EXISTS "readableId",
            DROP COLUMN IF EXISTS "parentCalcId",
            DROP COLUMN IF EXISTS "seriesId",
            DROP COLUMN IF EXISTS "version",
            DROP COLUMN IF EXISTS "status"
        `);

		await queryRunner.query(`
            DROP TYPE IF EXISTS "calculation_status_enum"
        `);
	}
}
