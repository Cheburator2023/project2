import { AddVersioningFieldsFixed1755251569000 } from "../../../src/migrations/1755251569000-AddVersioningFieldsFixed";

/**
 * Фабрика мока QueryRunner для TypeORM-миграций.
 * Эмулирует состояние БД: наличие колонок, индексов, enum-типов и FK-ограничений.
 * Все SQL-запросы фиксируются в массиве qr.queries для последующих проверок.
 */
const buildQueryRunner = (cfg: {
	hasColumns?: Record<string, boolean>;
	statusEnumExists?: boolean;
	existingIndexes?: string[];
	hasFkConstraint?: boolean;
	tableColumns?: string[];
}) => {
	const queries: string[] = [];
	const initialColumns = { ...cfg.hasColumns };
	let statusEnumExists = cfg.statusEnumExists ?? false;
	const existingIndexes = cfg.existingIndexes ?? [];
	let hasFkConstraint = cfg.hasFkConstraint ?? false;
	const tableColumns = cfg.tableColumns ?? [];

	const qr: any = {
		queries,
		hasColumn: jest.fn(async (_table: string, name: string) => {
			return Boolean(initialColumns[name]);
		}),
		query: jest.fn(async (sql: string) => {
			queries.push(sql);
			if (sql.includes("typname = 'calculation_status_enum'")) {
				return [{ exists: statusEnumExists }];
			}
			if (sql.includes("FROM pg_indexes")) {
				return existingIndexes.map((indexname) => ({ indexname }));
			}
			if (sql.includes("FROM pg_constraint")) {
				return hasFkConstraint ? [{ conname: "fk_calculation_parent" }] : [];
			}
			if (sql.includes("CREATE TYPE")) {
				statusEnumExists = true;
			}
			if (sql.includes("DROP TYPE")) {
				statusEnumExists = false;
			}
			if (sql.includes("ADD CONSTRAINT fk_calculation_parent")) {
				hasFkConstraint = true;
			}
			if (sql.includes("DROP CONSTRAINT fk_calculation_parent")) {
				hasFkConstraint = false;
			}
			return undefined;
		}),
		getTable: jest.fn(async () => ({
			columns: tableColumns.map((name) => ({ name })),
		})),
	};
	return qr;
};

/**
 * Unit-тесты миграции AddVersioningFieldsFixed.
 * Тестируются методы up() и down() на моке QueryRunner без реальной БД.
 * Проверяем: создание колонок, enum, индексов, FK; пропуск уже существующих объектов; откат.
 */
describe("AddVersioningFieldsFixed1755251569000", () => {
	let migration: AddVersioningFieldsFixed1755251569000;

	beforeEach(() => {
		migration = new AddVersioningFieldsFixed1755251569000();
	});

	/**
	 * up() — применение миграции.
	 */
	describe("up", () => {
		// Чистая БД: создаём всё с нуля
		it("creates everything when nothing exists yet", async () => {
			const qr = buildQueryRunner({
				hasColumns: {},
				statusEnumExists: false,
				existingIndexes: [],
				hasFkConstraint: false,
			});
			await migration.up(qr);
			const sqls = qr.queries.join("\n");
			expect(sqls).toContain("CREATE TYPE");
			expect(sqls).toContain('ADD COLUMN "status"');
			expect(sqls).toContain('ADD COLUMN "version"');
			expect(sqls).toContain('ADD COLUMN "seriesId"');
			expect(sqls).toContain('ADD COLUMN "parentCalcId"');
			expect(sqls).toContain('ADD COLUMN "readableId"');
			expect(sqls).toContain("idx_calculation_status");
			expect(sqls).toContain("fk_calculation_parent");
		});

		// Если колонки version/status уже существуют — сначала удаляем легаси-версии
		it("drops legacy version/status columns first when they pre-exist", async () => {
			const qr = buildQueryRunner({
				hasColumns: { version: true, status: true },
				statusEnumExists: true,
				existingIndexes: [],
				hasFkConstraint: false,
			});
			await migration.up(qr);
			const sqls = qr.queries.join("\n");
			expect(sqls).toContain('DROP COLUMN IF EXISTS "version"');
			expect(sqls).toContain('DROP COLUMN IF EXISTS "status"');
			// CREATE TYPE skipped because already exists
			expect(sqls).not.toContain("CREATE TYPE");
		});

		// Если все индексы уже есть — не создаём повторно (идемпотентность)
		it("skips index creation if all indexes already exist", async () => {
			const qr = buildQueryRunner({
				hasColumns: {
					status: false,
					version: false,
					seriesId: false,
					parentCalcId: false,
					readableId: false,
				},
				existingIndexes: [
					"idx_calculation_status",
					"idx_calculation_series_id",
					"idx_calculation_parent_calc_id",
					"idx_calculation_readable_id",
				],
				hasFkConstraint: true,
			});
			await migration.up(qr);
			const createIndexCount = qr.queries.filter((q) =>
				q.includes("CREATE INDEX"),
			).length;
			expect(createIndexCount).toBe(0);
		});
	});

	/**
	 * down() — откат миграции.
	 */
	describe("down", () => {
		// Полный откат: удаляем FK, индексы, колонки, enum-тип
		it("drops fk, indexes, columns and enum when everything exists", async () => {
			const qr = buildQueryRunner({
				hasFkConstraint: true,
				existingIndexes: [
					"idx_calculation_status",
					"idx_calculation_series_id",
					"idx_calculation_parent_calc_id",
					"idx_calculation_readable_id",
				],
				tableColumns: [
					"status",
					"version",
					"seriesId",
					"parentCalcId",
					"readableId",
				],
				statusEnumExists: true,
			});
			await migration.down(qr);
			const sqls = qr.queries.join("\n");
			expect(sqls).toContain("DROP CONSTRAINT fk_calculation_parent");
			expect(sqls).toContain(
				"DROP INDEX IF EXISTS idx_calculation_readable_id",
			);
			expect(sqls).toContain('DROP COLUMN IF EXISTS "readableId"');
			expect(sqls).toContain("DROP TYPE IF EXISTS");
		});

		// Если откатывать нечего — ни один DROP не выполняется
		it("skips drops when nothing exists", async () => {
			const qr = buildQueryRunner({
				hasFkConstraint: false,
				existingIndexes: [],
				tableColumns: [],
				statusEnumExists: false,
			});
			await migration.down(qr);
			const sqls = qr.queries.join("\n");
			expect(sqls).not.toContain("DROP CONSTRAINT");
			expect(sqls).not.toContain("DROP COLUMN");
			expect(sqls).not.toContain("DROP TYPE");
		});

		// Если getTable вернул undefined — не падаем, columnNames=[]
		it("returns columnNames=[] when getTable returns nothing", async () => {
			const qr = buildQueryRunner({
				hasFkConstraint: false,
				existingIndexes: [],
				tableColumns: [],
				statusEnumExists: false,
			});
			qr.getTable = jest.fn().mockResolvedValue(undefined);
			await migration.down(qr);
			expect(qr.getTable).toHaveBeenCalled();
		});
	});
});
