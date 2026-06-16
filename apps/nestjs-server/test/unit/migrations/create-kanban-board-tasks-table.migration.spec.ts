import { CreateKanbanBoardTasksTable1760600000000 } from "../../../src/migrations/1760600000000-CreateKanbanBoardTasksTable";
import { QueryRunnerMock } from "../../mocks/query-runner.mock";

const buildQueryRunner = (cfg: {
	existingTables?: string[];
	existingColumns?: string[];
	existingIndexes?: string[];
	legacyIndexes?: string[];
	hasPrimaryKey?: boolean;
}) => {
	const queries: string[] = [];
	const tables = new Set(cfg.existingTables ?? []);
	const columns = new Set(cfg.existingColumns ?? []);
	const existingIndexes = new Set(cfg.existingIndexes ?? []);
	const legacyIndexes = new Set(cfg.legacyIndexes ?? []);
	let hasPrimaryKey = cfg.hasPrimaryKey ?? true;

	const qr = new QueryRunnerMock();
	qr.queries = queries;
	qr.query = jest.fn(async (sql: string, params?: unknown[]) => {
		queries.push(sql);

		if (sql.includes("FROM information_schema.tables")) {
			const tableName = (params?.[0] as string | undefined) ?? "";
			return tables.has(tableName) ? [{ "?column?": 1 }] : [];
		}

		if (sql.includes("FROM information_schema.columns")) {
			const tableName = (params?.[0] as string | undefined) ?? "";
			if (tableName !== "kanban_board_tasks") return [];
			return [...columns].map((column_name) => ({ column_name }));
		}

		if (sql.includes("constraint_type = 'PRIMARY KEY'")) {
			return hasPrimaryKey ? [{ "?column?": 1 }] : [];
		}

		if (sql.includes("indexname = $1")) {
			const legacyIndex = params?.[0] as string;
			return legacyIndexes.has(legacyIndex) ? [{ "?column?": 1 }] : [];
		}

		if (sql.includes("FROM pg_indexes") && sql.includes("indexname = ANY")) {
			return [...existingIndexes].map((indexname) => ({ indexname }));
		}

		if (sql.includes("ALTER TABLE tasks RENAME TO kanban_board_tasks")) {
			tables.delete("tasks");
			tables.add("kanban_board_tasks");
		}

		if (sql.includes("CREATE TABLE kanban_board_tasks")) {
			tables.add("kanban_board_tasks");
			for (const column of [
				"id",
				"parent_id",
				"position",
				"content",
				"origin",
				"updated_at",
			]) {
				columns.add(column);
			}
			hasPrimaryKey = true;
		}

		if (sql.includes("ADD COLUMN IF NOT EXISTS")) {
			const match = sql.match(/ADD COLUMN IF NOT EXISTS (\w+)/);
			if (match?.[1]) columns.add(match[1]);
		}

		if (sql.includes("ADD CONSTRAINT pk_kanban_board_tasks PRIMARY KEY")) {
			hasPrimaryKey = true;
		}

		if (sql.includes("DROP TABLE kanban_board_tasks")) {
			tables.delete("kanban_board_tasks");
		}

		if (sql.includes("CREATE INDEX idx_kanban_board_tasks_parent_id")) {
			existingIndexes.add("idx_kanban_board_tasks_parent_id");
		}

		if (sql.includes("CREATE INDEX idx_kanban_board_tasks_origin")) {
			existingIndexes.add("idx_kanban_board_tasks_origin");
		}

		if (sql.includes("ALTER INDEX idx_tasks_parent_id RENAME TO")) {
			legacyIndexes.delete("idx_tasks_parent_id");
			existingIndexes.add("idx_kanban_board_tasks_parent_id");
		}

		return undefined;
	}) as QueryRunnerMock["query"];

	return qr;
};

describe("CreateKanbanBoardTasksTable1760600000000", () => {
	let migration: CreateKanbanBoardTasksTable1760600000000;

	beforeEach(() => {
		migration = new CreateKanbanBoardTasksTable1760600000000();
	});

	it("creates kanban_board_tasks table and indexes when nothing exists", async () => {
		const queryRunner = buildQueryRunner({ existingTables: [] });

		await migration.up(queryRunner);

		expect(queryRunner.queries.some((q) => q.includes("CREATE TABLE kanban_board_tasks"))).toBe(
			true,
		);
	});

	it("renames legacy tasks table and indexes", async () => {
		const queryRunner = buildQueryRunner({
			existingTables: ["tasks"],
			existingColumns: [
				"id",
				"parent_id",
				"position",
				"content",
				"origin",
				"updated_at",
			],
			legacyIndexes: ["idx_tasks_parent_id", "idx_tasks_origin"],
		});

		await migration.up(queryRunner);

		expect(
			queryRunner.queries.some((q) =>
				q.includes("ALTER TABLE tasks RENAME TO kanban_board_tasks"),
			),
		).toBe(true);
	});

	it("adds missing columns when kanban_board_tasks already exists", async () => {
		const queryRunner = buildQueryRunner({
			existingTables: ["kanban_board_tasks"],
			existingColumns: ["id"],
			hasPrimaryKey: true,
		});

		await migration.up(queryRunner);

		expect(
			queryRunner.queries.some((q) =>
				q.includes("ADD COLUMN IF NOT EXISTS parent_id"),
			),
		).toBe(true);
	});

	it("drops kanban_board_tasks on down", async () => {
		const queryRunner = buildQueryRunner({ existingTables: ["kanban_board_tasks"] });

		await migration.down(queryRunner);

		expect(queryRunner.queries.at(-1)).toContain("DROP TABLE kanban_board_tasks");
	});
});
