import { DataSource } from "typeorm";
import { CreateQuestionnaireSchema1718651234568 } from "../../../src/migrations/1718651234568-CreateQuestionnaireSchema";
import { QueryRunnerMock } from "../../mocks/query-runner.mock";

describe("CreateQuestionnaireSchema1718651234568", () => {
	let migration: CreateQuestionnaireSchema1718651234568;
	let queryRunner: QueryRunnerMock;
	let dataSource: DataSource;

	beforeEach(() => {
		migration = new CreateQuestionnaireSchema1718651234568();
		queryRunner = new QueryRunnerMock();
		dataSource = new DataSource({ type: "postgres" });
		queryRunner.connection = dataSource;
	});

	it("should be defined", () => {
		expect(migration).toBeDefined();
	});

	describe("up", () => {
		it("should execute correct queries in order", async () => {
			await migration.up(queryRunner);

			const queries = queryRunner.queries.map((q) => q.trim().split("\n")[0]);
			expect(queries[0]).toContain(
				"CREATE TABLE IF NOT EXISTS questionnaire_item",
			);
			expect(queries[1]).toContain("CREATE TABLE IF NOT EXISTS coefficient");
			expect(queries[2]).toContain("CREATE TABLE IF NOT EXISTS stream_average");
			expect(queries[3]).toContain("INSERT INTO questionnaire_item");
			expect(queries[4]).toContain("INSERT INTO coefficient");
			expect(queries[5]).toContain("INSERT INTO stream_average");
		});
	});

	describe("down", () => {
		it("should drop all tables", async () => {
			await migration.down(queryRunner);
			expect(queryRunner.queries[0]).toContain(
				"DROP TABLE IF EXISTS stream_average",
			);
			expect(queryRunner.queries[1]).toContain(
				"DROP TABLE IF EXISTS coefficient",
			);
			expect(queryRunner.queries[2]).toContain(
				"DROP TABLE IF EXISTS questionnaire_item",
			);
		});
	});
});
