import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVersioningFieldsFixed1755251569000
	implements MigrationInterface
{
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasVersionColumn = await queryRunner.hasColumn("calculation", "version");
        const hasStatusColumn = await queryRunner.hasColumn("calculation", "status");

        if (hasVersionColumn) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "version"`);
        }

        if (hasStatusColumn) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "status"`);
        }

        const hasStatusEnum = await queryRunner.query(`
			SELECT EXISTS (
				SELECT 1 FROM pg_type WHERE typname = 'calculation_status_enum'
			)
		`);

        if (!hasStatusEnum[0].exists) {
            await queryRunner.query(`
				CREATE TYPE "calculation_status_enum" AS ENUM ('Активная', 'Архивная')
			`);
        }

        const hasNewStatusColumn = await queryRunner.hasColumn("calculation", "status");
        const hasVersionNewColumn = await queryRunner.hasColumn("calculation", "version");
        const hasSeriesIdColumn = await queryRunner.hasColumn("calculation", "seriesId");
        const hasParentCalcIdColumn = await queryRunner.hasColumn("calculation", "parentCalcId");
        const hasReadableIdColumn = await queryRunner.hasColumn("calculation", "readableId");

        if (!hasNewStatusColumn) {
            await queryRunner.query(`
				ALTER TABLE calculation 
				ADD COLUMN "status" "calculation_status_enum" DEFAULT 'Активная'
			`);
        }

        if (!hasVersionNewColumn) {
            await queryRunner.query(`
				ALTER TABLE calculation 
				ADD COLUMN "version" varchar(20) DEFAULT '1'
			`);
        }

        if (!hasSeriesIdColumn) {
            await queryRunner.query(`
				ALTER TABLE calculation 
				ADD COLUMN "seriesId" varchar(50)
			`);
        }

        if (!hasParentCalcIdColumn) {
            await queryRunner.query(`
				ALTER TABLE calculation 
				ADD COLUMN "parentCalcId" uuid
			`);
        }

        if (!hasReadableIdColumn) {
            await queryRunner.query(`
				ALTER TABLE calculation 
				ADD COLUMN "readableId" varchar(100)
			`);
        }

        await queryRunner.query(`
			UPDATE calculation
			SET
				"status" = 'Активная',
				"version" = '1'
			WHERE "status" IS NULL OR "version" IS NULL
		`);

        const indexes = await queryRunner.query(`
			SELECT indexname FROM pg_indexes 
			WHERE tablename = 'calculation' 
			AND indexname IN (
				'idx_calculation_status',
				'idx_calculation_series_id', 
				'idx_calculation_parent_calc_id',
				'idx_calculation_readable_id'
			)
		`);

        const existingIndexes = indexes.map(index => index.indexname);

        if (!existingIndexes.includes('idx_calculation_status')) {
            await queryRunner.query(`
				CREATE INDEX idx_calculation_status ON calculation("status")
			`);
        }

        if (!existingIndexes.includes('idx_calculation_series_id')) {
            await queryRunner.query(`
				CREATE INDEX idx_calculation_series_id ON calculation("seriesId")
			`);
        }

        if (!existingIndexes.includes('idx_calculation_parent_calc_id')) {
            await queryRunner.query(`
				CREATE INDEX idx_calculation_parent_calc_id ON calculation("parentCalcId")
			`);
        }

        if (!existingIndexes.includes('idx_calculation_readable_id')) {
            await queryRunner.query(`
				CREATE INDEX idx_calculation_readable_id ON calculation("readableId")
			`);
        }

        const constraints = await queryRunner.query(`
			SELECT conname FROM pg_constraint 
			WHERE conname = 'fk_calculation_parent'
		`);

        if (constraints.length === 0) {
            await queryRunner.query(`
				ALTER TABLE calculation 
				ADD CONSTRAINT fk_calculation_parent 
				FOREIGN KEY ("parentCalcId") REFERENCES calculation("id")
			`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const constraints = await queryRunner.query(`
			SELECT conname FROM pg_constraint 
			WHERE conname = 'fk_calculation_parent'
		`);

        if (constraints.length > 0) {
            await queryRunner.query(`
				ALTER TABLE calculation DROP CONSTRAINT fk_calculation_parent
			`);
        }

        const indexes = await queryRunner.query(`
			SELECT indexname FROM pg_indexes 
			WHERE tablename = 'calculation' 
			AND indexname IN (
				'idx_calculation_status',
				'idx_calculation_series_id', 
				'idx_calculation_parent_calc_id',
				'idx_calculation_readable_id'
			)
		`);

        const existingIndexes = indexes.map(index => index.indexname);

        if (existingIndexes.includes('idx_calculation_readable_id')) {
            await queryRunner.query(`DROP INDEX IF EXISTS idx_calculation_readable_id`);
        }

        if (existingIndexes.includes('idx_calculation_parent_calc_id')) {
            await queryRunner.query(`DROP INDEX IF EXISTS idx_calculation_parent_calc_id`);
        }

        if (existingIndexes.includes('idx_calculation_series_id')) {
            await queryRunner.query(`DROP INDEX IF EXISTS idx_calculation_series_id`);
        }

        if (existingIndexes.includes('idx_calculation_status')) {
            await queryRunner.query(`DROP INDEX IF EXISTS idx_calculation_status`);
        }

        const columns = await queryRunner.getTable("calculation");
        const columnNames = columns?.columns.map(col => col.name) || [];

        if (columnNames.includes("readableId")) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "readableId"`);
        }

        if (columnNames.includes("parentCalcId")) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "parentCalcId"`);
        }

        if (columnNames.includes("seriesId")) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "seriesId"`);
        }

        if (columnNames.includes("version")) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "version"`);
        }

        if (columnNames.includes("status")) {
            await queryRunner.query(`ALTER TABLE calculation DROP COLUMN IF EXISTS "status"`);
        }

        const hasStatusEnum = await queryRunner.query(`
			SELECT EXISTS (
				SELECT 1 FROM pg_type WHERE typname = 'calculation_status_enum'
			)
		`);

        if (hasStatusEnum[0].exists) {
            await queryRunner.query(`DROP TYPE IF EXISTS "calculation_status_enum"`);
        }
    }
}