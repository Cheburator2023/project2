import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Трекер живёт в sum-tracker и читает те же таблицы kanban_* в схеме sumd.
 * DROP здесь уничтожит данные стенда. Миграция остаётся в истории как no-op,
 * чтобы TypeORM пометил её выполненной и больше не пытался снести таблицы.
 */
export class DropTrackerTables1766100000000 implements MigrationInterface {
	name = "DropTrackerTables1766100000000";

	public async up(_queryRunner: QueryRunner): Promise<void> {
		/* intentionally empty — shared kanban_* tables belong to sum-tracker */
	}

	public async down(): Promise<void> {
		/* tracker schema lives in sum-tracker */
	}
}
