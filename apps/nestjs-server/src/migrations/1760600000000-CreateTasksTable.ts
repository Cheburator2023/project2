import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasksTable1760600000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS tasks (
				id varchar(26) PRIMARY KEY,
				parent_id varchar(64) NOT NULL,
				position integer NOT NULL,
				content jsonb NOT NULL,
				origin varchar(255) NOT NULL,
				updated_at varchar(64) NOT NULL
			)
		`);

		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_tasks_origin ON tasks(origin)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
	}
}
