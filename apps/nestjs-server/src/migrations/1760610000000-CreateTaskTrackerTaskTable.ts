import { MigrationInterface, QueryRunner } from "typeorm";

const TABLE = "task_tracker_task";

export class CreateTaskTrackerTaskTable1760610000000
	implements MigrationInterface
{
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS ${TABLE} (
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
			addSql: `ALTER TABLE ${TABLE} ADD COLUMN parent_id varchar(64) NOT NULL DEFAULT ''`,
		});
		await this.ensureColumn(queryRunner, {
			column: "position",
			addSql: `ALTER TABLE ${TABLE} ADD COLUMN position integer NOT NULL DEFAULT 0`,
		});
		await this.ensureColumn(queryRunner, {
			column: "content",
			addSql: `ALTER TABLE ${TABLE} ADD COLUMN content jsonb NOT NULL DEFAULT '{}'::jsonb`,
		});
		await this.ensureColumn(queryRunner, {
			column: "origin",
			addSql: `ALTER TABLE ${TABLE} ADD COLUMN origin varchar(255) NOT NULL DEFAULT ''`,
		});
		await this.ensureColumn(queryRunner, {
			column: "updated_at",
			legacyColumn: "updatedAt",
			addSql: `ALTER TABLE ${TABLE} ADD COLUMN updated_at varchar(64) NOT NULL DEFAULT ''`,
		});

		const indexes = await queryRunner.query(`
			SELECT indexname FROM pg_indexes
			WHERE tablename = '${TABLE}'
			AND indexname IN (
				'idx_task_tracker_task_parent_id',
				'idx_task_tracker_task_origin'
			)
		`);
		const existingIndexes = indexes.map(
			(index: { indexname: string }) => index.indexname,
		);

		if (!existingIndexes.includes("idx_task_tracker_task_parent_id")) {
			await queryRunner.query(`
				CREATE INDEX idx_task_tracker_task_parent_id ON ${TABLE}(parent_id)
			`);
		}
		if (!existingIndexes.includes("idx_task_tracker_task_origin")) {
			await queryRunner.query(`
				CREATE INDEX idx_task_tracker_task_origin ON ${TABLE}(origin)
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
		if (await queryRunner.hasColumn(TABLE, options.column)) {
			return;
		}

		if (
			options.legacyColumn &&
			(await queryRunner.hasColumn(TABLE, options.legacyColumn))
		) {
			await queryRunner.query(
				`ALTER TABLE ${TABLE} RENAME COLUMN "${options.legacyColumn}" TO ${options.column}`,
			);
			return;
		}

		await queryRunner.query(options.addSql);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE}`);
	}
}
