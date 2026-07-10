import { CollapseSourceStreams1762500000000 } from "../../../src/migrations/1762500000000-CollapseSourceStreams";
import { QueryRunnerMock } from "../../mocks/query-runner.mock";

/**
 * Unit-тесты миграции схлопывания стримов источников (внутр/внеш → «Источники
 * данных»). Проверяем намерение SQL на мок-QueryRunner (без реальной БД):
 * переименование по всем 6 таблицам, детерминированный приоритет реконсиляции
 * (внутренний побеждает внешний), удаление внешних норм при наличии внутренних,
 * снятие противоречивых триггеров типа и no-op откат.
 */
describe("CollapseSourceStreams1762500000000", () => {
	const TABLES = [
		"v2_typical_work_assignment",
		"v2_typical_work_norm",
		"v2_typical_work_rule",
		"v2_typical_work_labor_coefficient",
		"v2_typical_work_labor_param",
		"v2_typical_work_version_config",
	];

	it("переименовывает legacy-стримы в «Источники данных» во всех 6 таблицах", async () => {
		const qr = new QueryRunnerMock();
		await new CollapseSourceStreams1762500000000().up(qr);

		for (const table of TABLES) {
			const renamed = qr.queries.some(
				(sql) =>
					sql.includes(`UPDATE ${table}`) &&
					sql.includes("SET stream_executor = 'Источники данных'") &&
					sql.includes("'ИД. Внутренний'") &&
					sql.includes("'ИД. Внешний'"),
			);
			expect(renamed).toBe(true);
		}
	});

	it("при коллизии уникальных индексов приоритет — внутренний над внешним", async () => {
		const qr = new QueryRunnerMock();
		await new CollapseSourceStreams1762500000000().up(qr);

		const dedupWithPriority = qr.queries.filter(
			(sql) =>
				sql.includes("row_number() OVER") &&
				/WHEN 'Источники данных' THEN 0/.test(sql) &&
				/WHEN 'ИД\. Внутренний' THEN 1/.test(sql) &&
				/WHEN 'ИД\. Внешний' THEN 2/.test(sql),
		);
		// Дедуп с приоритетом для assignment, labor_coefficient, labor_param, version_config.
		expect(dedupWithPriority.length).toBeGreaterThanOrEqual(4);
	});

	it("удаляет внешние нормы работы, если у неё есть внутренние", async () => {
		const qr = new QueryRunnerMock();
		await new CollapseSourceStreams1762500000000().up(qr);

		const normReconcile = qr.queries.some(
			(sql) =>
				sql.includes("DELETE FROM v2_typical_work_norm") &&
				sql.includes("e.stream_executor = 'ИД. Внешний'") &&
				sql.includes("i.stream_executor = 'ИД. Внутренний'"),
		);
		expect(normReconcile).toBe(true);
	});

	it("снимает противоречивые триггеры типа источника (и внутр, и внеш)", async () => {
		const qr = new QueryRunnerMock();
		await new CollapseSourceStreams1762500000000().up(qr);

		const contradictory = qr.queries.some(
			(sql) =>
				sql.includes("DELETE FROM v2_typical_work_rule") &&
				sql.includes("('внутренний', 'внешний')"),
		);
		expect(contradictory).toBe(true);
	});

	it("down() — no-op (необратимая миграция)", async () => {
		const qr = new QueryRunnerMock();
		await new CollapseSourceStreams1762500000000().down();
		expect(qr.queries).toHaveLength(0);
	});
});
