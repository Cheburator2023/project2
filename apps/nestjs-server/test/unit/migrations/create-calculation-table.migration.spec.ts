import { CreateCalculationTable1718651234567 } from "../../../src/migrations/1718651234567-CreateCalculationTable";
import { QueryRunnerMock } from "../../mocks/query-runner.mock";

/**
 * Unit-тесты миграции CreateCalculationTable.
 * Проверяем SQL-запросы up() (создание таблицы + индекс) и down() (удаление).
 * Используется общий QueryRunnerMock.
 */
describe("CreateCalculationTable1718651234567", () => {
	let migration: CreateCalculationTable1718651234567;
	let queryRunner: QueryRunnerMock;

	beforeEach(() => {
		migration = new CreateCalculationTable1718651234567();
		queryRunner = new QueryRunnerMock();
	});

	it("should be defined", () => {
		expect(migration).toBeDefined();
	});

	/**
	 * up() — должен выполнить 2 запроса: CREATE TABLE + CREATE INDEX.
	 */
	describe("up", () => {
		it("should create calculation table and index", async () => {
			await migration.up(queryRunner);

			expect(queryRunner.queries.length).toBe(2);
			expect(queryRunner.queries[0]).toContain(
				"CREATE TABLE IF NOT EXISTS calculation",
			);
			expect(queryRunner.queries[1]).toContain("idx_calculation_created_at");
			expect(queryRunner.queries[1]).toContain("CREATE INDEX");
		});
	});

	/**
	 * down() — должен выполнить 2 запроса: DROP INDEX + DROP TABLE.
	 */
	describe("down", () => {
		it("should drop index and table", async () => {
			await migration.down(queryRunner);

			expect(queryRunner.queries.length).toBe(2);
			expect(queryRunner.queries[0]).toContain(
				"DROP INDEX idx_calculation_created_at",
			);
			expect(queryRunner.queries[1]).toContain("DROP TABLE calculation");
		});
	});
});
