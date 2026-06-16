import { NormalizeKanbanBoardTasksSchema1760900000000 } from "../../../src/migrations/1760900000000-NormalizeKanbanBoardTasksSchema";
import { QueryRunnerMock } from "../../mocks/query-runner.mock";

const buildQueryRunner = (initialColumns: string[]) => {
	const queries: string[] = [];
	let columns = [...initialColumns];
	let hasPrimaryKey = false;

	const qr = new QueryRunnerMock();
	qr.queries = queries;
	qr.query = jest.fn(async (sql: string, params?: unknown[]) => {
		queries.push(sql);

		if (sql.includes("FROM information_schema.tables")) {
			return [{ "?column?": 1 }];
		}

		if (sql.includes("FROM information_schema.columns")) {
			const tableName = (params?.[0] as string | undefined) ?? "";
			if (tableName !== "kanban_board_tasks") return [];
			return columns.map((column_name) => ({ column_name }));
		}

		if (sql.includes("RENAME COLUMN task_id TO id")) {
			columns = columns.map((column) =>
				column === "task_id" ? "id" : column,
			);
		}

		if (sql.includes('DROP COLUMN IF EXISTS "')) {
			const match = sql.match(/DROP COLUMN IF EXISTS "([^"]+)"/);
			if (match?.[1]) {
				columns = columns.filter((column) => column !== match[1]);
			}
		}

		if (sql.includes("ADD CONSTRAINT pk_kanban_board_tasks PRIMARY KEY")) {
			hasPrimaryKey = true;
		}

		if (sql.includes("constraint_type = 'PRIMARY KEY'")) {
			return hasPrimaryKey ? [{ "?column?": 1 }] : [];
		}

		return [];
	});

	return { queryRunner: qr, queries };
};

describe("NormalizeKanbanBoardTasksSchema1760900000000", () => {
	it("drops legacy columns and keeps kanban schema columns", async () => {
		const { queryRunner, queries } = buildQueryRunner([
			"task_id",
			"legacy_a",
			"legacy_b",
			"legacy_c",
			"id",
			"parent_id",
			"position",
			"content",
			"origin",
			"updated_at",
			"board_id",
		]);

		await new NormalizeKanbanBoardTasksSchema1760900000000().up(queryRunner);

		expect(
			queries.some((query) =>
				query.includes('DROP COLUMN IF EXISTS "task_id"'),
			),
		).toBe(true);
		expect(
			queries.some((query) =>
				query.includes('DROP COLUMN IF EXISTS "legacy_a"'),
			),
		).toBe(true);
		expect(
			queries.some((query) =>
				query.includes("ADD CONSTRAINT pk_kanban_board_tasks PRIMARY KEY"),
			),
		).toBe(true);
		expect(queries.some((query) => query.includes('DROP COLUMN IF EXISTS "id"'))).toBe(
			false,
		);
	});
});
