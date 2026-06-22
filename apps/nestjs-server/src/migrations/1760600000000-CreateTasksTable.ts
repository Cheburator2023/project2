import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ранние версии целили в таблицу `tasks`, которая уже занята legacy-схемой sumd
 * (tasks_artefacts, tasks_permissions). Актуальная схема — в 176061.
 */
export class CreateTasksTable1760600000000 implements MigrationInterface {
	public async up(): Promise<void> {}

	public async down(): Promise<void> {}
}
