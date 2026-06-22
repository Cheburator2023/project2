import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTasksTable1760600000000 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS tasks (
				id varchar(26) PRIMARY KEY,
				parent_id varchar(64) NOT NULL DEFAULT '',
				position integer NOT NULL DEFAULT 0,
				content jsonb NOT NULL DEFAULT '{}'::jsonb,
				origin varchar(255) NOT NULL DEFAULT '',
				updated_at varchar(64) NOT NULL DEFAULT ''
			)
		`);

		await this.ensureColumn(queryRunner, {
			column: "parent_id",
			legacyColumn: "parentId",
			addSql: `ALTER TABLE tasks ADD COLUMN parent_id varchar(64) NOT NULL DEFAULT ''`,
		});
		await this.ensureColumn(queryRunner, {
			column: "position",
			addSql: `ALTER TABLE tasks ADD COLUMN position integer NOT NULL DEFAULT 0`,
		});
		await this.ensureColumn(queryRunner, {
			column: "content",
			addSql: `ALTER TABLE tasks ADD COLUMN content jsonb NOT NULL DEFAULT '{}'::jsonb`,
		});
		await this.ensureColumn(queryRunner, {
			column: "origin",
			addSql: `ALTER TABLE tasks ADD COLUMN origin varchar(255) NOT NULL DEFAULT ''`,
		});
		await this.ensureColumn(queryRunner, {
			column: "updated_at",
			legacyColumn: "updatedAt",
			addSql: `ALTER TABLE tasks ADD COLUMN updated_at varchar(64) NOT NULL DEFAULT ''`,
		});

		const indexes = await queryRunner.query(`
			SELECT indexname FROM pg_indexes
			WHERE tablename = 'tasks'
			AND indexname IN ('idx_tasks_parent_id', 'idx_tasks_origin')
		`);
		const existingIndexes = indexes.map(
			(index: { indexname: string }) => index.indexname,
		);

		if (!existingIndexes.includes("idx_tasks_parent_id")) {
			await queryRunner.query(`
				CREATE INDEX idx_tasks_parent_id ON tasks(parent_id)
			`);
		}
		if (!existingIndexes.includes("idx_tasks_origin")) {
			await queryRunner.query(`
				CREATE INDEX idx_tasks_origin ON tasks(origin)
			`);
		}
	}

	private async ensureColumn(
		queryRunner: QueryRunner,
		options: {
			column: string;
			legacyColumn?: string;
			addSql: string;
		},
	): Promise<void> {
		if (await queryRunner.hasColumn("tasks", options.column)) {
			return;
		}

		if (
			options.legacyColumn &&
			(await queryRunner.hasColumn("tasks", options.legacyColumn))
		) {
			await queryRunner.query(
				`ALTER TABLE tasks RENAME COLUMN "${options.legacyColumn}" TO ${options.column}`,
			);
			return;
		}

		await queryRunner.query(options.addSql);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
	}
}
