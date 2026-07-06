import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { getApp } from "test/setup-e2e";

jest.setTimeout(120_000);

const STREAM_INTERNAL = "ИД. Внутренний";
const STREAM_EXTERNAL = "ИД. Внешний";
const ARCH_SOURCE = "Система-источник";

/**
 * E2e: полный цикл HTTP API типовых работ — каталог, CRUD, параметры,
 * назначения, превью расчёта и evaluate через /v2/templates/:id/calculate.
 */
describe("V2TypicalWork full cycle (e2e)", () => {
	let app: INestApplication;

	const runId = Date.now();
	const workName = `E2E full cycle ${runId}`;
	const paramName = `E2E param ${runId}`;

	let workId: string;
	let externalAssignmentId: string;
	let paramCode: string;
	let paramValueCode: string;
	let templateId: string | undefined;

	beforeAll(async () => {
		app = await getApp();
	});

	it("GET /v2/works/catalog — реестр работ", async () => {
		const res = await request(app.getHttpServer())
			.get("/v2/works/catalog")
			.expect(200);

		expect(res.body).toHaveProperty("items");
		expect(Array.isArray(res.body.items)).toBe(true);
	});

	it("GET /v2/works/parameters/catalog — справочник параметров", async () => {
		const res = await request(app.getHttpServer())
			.get("/v2/works/parameters/catalog")
			.expect(200);

		expect(res.body).toHaveProperty("items");
		expect(Array.isArray(res.body.items)).toBe(true);
	});

	it("GET /v2/works/parameters/dependencies — зависимости параметров", async () => {
		const res = await request(app.getHttpServer())
			.get("/v2/works/parameters/dependencies")
			.expect(200);

		expect(res.body).toHaveProperty("items");
		expect(Array.isArray(res.body.items)).toBe(true);
	});

	it("POST /v2/works/parameters — создаёт параметр", async () => {
		const res = await request(app.getHttpServer())
			.post("/v2/works/parameters")
			.send({
				name: paramName,
				description: "E2E temporary parameter",
			})
			.expect(201);

		paramCode = res.body.code;
		expect(res.body.name).toBe(paramName);
		expect(res.body.values).toEqual([]);
	});

	it("POST /v2/works/parameters/:code/values — создаёт значение параметра", async () => {
		const res = await request(app.getHttpServer())
			.post(`/v2/works/parameters/${paramCode}/values`)
			.send({
				label: "E2E value",
				coefficient: 1.2,
				validFrom: "2025-01-01",
			})
			.expect(201);

		paramValueCode = res.body.code;
		expect(res.body.label).toBe("E2E value");
		expect(Number(res.body.coefficient)).toBe(1.2);
	});

	it("PATCH /v2/works/parameters/:code/values/:valueCode — обновляет значение", async () => {
		await request(app.getHttpServer())
			.patch(`/v2/works/parameters/${paramCode}/values/${paramValueCode}`)
			.send({ label: "E2E value updated", coefficient: 1.5 })
			.expect(200)
			.expect((res) => {
				expect(res.body.label).toBe("E2E value updated");
				expect(Number(res.body.coefficient)).toBe(1.5);
			});
	});

	it("POST /v2/works — создаёт работу с назначением и стартовой нормой", async () => {
		const res = await request(app.getHttpServer())
			.post("/v2/works")
			.send({
				name: workName,
				archComponentType: ARCH_SOURCE,
				streamExecutor: STREAM_INTERNAL,
				starterNormValue: 3,
			})
			.expect(201);

		workId = res.body.id;
		expect(res.body.name).toBe(workName);
		expect(res.body.archComponentType).toBe(ARCH_SOURCE);
		expect(res.body.streamExecutor).toBe(STREAM_INTERNAL);
		expect(res.body.norms.length).toBeGreaterThan(0);
	});

	it("GET /v2/works — список с фильтром по арх. компоненту", async () => {
		const res = await request(app.getHttpServer())
			.get("/v2/works")
			.query({ archComponentType: ARCH_SOURCE, streamExecutor: STREAM_INTERNAL })
			.expect(200);

		expect(res.body.items.some((item: { id: string }) => item.id === workId)).toBe(
			true,
		);
	});

	it("GET /v2/works/:id — карточка работы для стрима", async () => {
		const res = await request(app.getHttpServer())
			.get(`/v2/works/${workId}`)
			.query({ streamExecutor: STREAM_INTERNAL })
			.expect(200);

		expect(res.body.id).toBe(workId);
		expect(res.body.name).toBe(workName);
	});

	it("GET /v2/works/assignments/list — назначения содержат созданную работу", async () => {
		const res = await request(app.getHttpServer())
			.get("/v2/works/assignments/list")
			.query({
				workId,
				streamExecutor: STREAM_INTERNAL,
				archComponentType: ARCH_SOURCE,
			})
			.expect(200);

		expect(res.body.items.length).toBeGreaterThan(0);
		expect(
			res.body.items.some(
				(item: { workId: string; streamExecutor: string }) =>
					item.workId === workId && item.streamExecutor === STREAM_INTERNAL,
			),
		).toBe(true);
	});

	it("POST /v2/works/assignments — второе назначение на внешний стрим", async () => {
		const res = await request(app.getHttpServer())
			.post("/v2/works/assignments")
			.send({
				workId,
				streamExecutor: STREAM_EXTERNAL,
			})
			.expect(201);

		externalAssignmentId = res.body.id;
		expect(res.body.workId).toBe(workId);
		expect(res.body.streamExecutor).toBe(STREAM_EXTERNAL);
	});

	it("PATCH /v2/works/:id — норма, триггер type и формула H", async () => {
		await request(app.getHttpServer())
			.patch(`/v2/works/${workId}`)
			.send({
				streamExecutor: STREAM_INTERNAL,
				norms: [
					{
						normValue: 2.5,
						validFrom: "2025-01-01",
					},
				],
				rules: [
					{
						paramCode: "type",
						paramName: "Тип системы",
						operator: "eq",
						valueLabel: "Внутренний",
					},
				],
				formula: {
					tokens: [{ kind: "norm" }],
					text: "H",
				},
				rounding: { mode: "CEIL", step: 0.1 },
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.rules).toHaveLength(1);
				expect(Number(res.body.norms[0].normValue)).toBe(2.5);
				expect(res.body.formula.tokens).toEqual([{ kind: "norm" }]);
			});
	});

	it("POST /v2/works/:id/preview — превью расчёта по формуле", async () => {
		await request(app.getHttpServer())
			.post(`/v2/works/${workId}/preview`)
			.send({
				streamExecutor: STREAM_INTERNAL,
				atDate: "2025-06-01",
			})
			.expect(201)
			.expect((res) => {
				expect(res.body.error).toBeNull();
				expect(res.body.result).toBe(2.5);
				expect(String(res.body.formulaSymbolic)).toMatch(/N|H/);
			});
	});

	it("POST /v2/works/calculation-logic/backfill — компиляция JsonLogic", async () => {
		const res = await request(app.getHttpServer())
			.post("/v2/works/calculation-logic/backfill")
			.expect(201);

		expect(res.body).toHaveProperty("updated");
		expect(res.body).toHaveProperty("skipped");
		expect(typeof res.body.updated).toBe("number");
	});

	it("GET /v2/templates — выбирает шаблон для evaluate", async () => {
		const res = await request(app.getHttpServer()).get("/v2/templates").expect(200);

		expect(Array.isArray(res.body)).toBe(true);
		const withVersion = res.body.find(
			(t: { currentVersionId?: string | null }) => t.currentVersionId,
		);
		templateId = withVersion?.id;
		expect(templateId).toBeDefined();
	});

	it("POST /v2/templates/:id/calculate — генерирует типовые работы в анкете", async () => {
		expect(templateId).toBeDefined();

		const res = await request(app.getHttpServer())
			.post(`/v2/templates/${templateId}/calculate`)
			.send({
				formData: {
					detailInfo: {
						sourceSystems: [{ name: "E2E CRM", type: "Внутренний" }],
					},
				},
			})
			.expect(201);

		const streamDataSources = res.body.formData?.streamDataSources as
			| {
					sourceTypicalTasks?: Array<{
						name: string;
						estimateHoursPerDay: number;
					}>;
			  }
			| undefined;

		expect(streamDataSources?.sourceTypicalTasks?.length).toBeGreaterThan(0);
		const createdTask = streamDataSources?.sourceTypicalTasks?.find(
			(task) => task.name === workName,
		);
		expect(createdTask).toBeDefined();
		expect(createdTask?.estimateHoursPerDay).toBe(2.5);
	});

	it("DELETE /v2/works/assignments/:id — снимает внешнее назначение", async () => {
		await request(app.getHttpServer())
			.delete(`/v2/works/assignments/${externalAssignmentId}`)
			.expect(204);
	});

	it("DELETE /v2/works/parameters/:code/values/:valueCode — удаляет значение", async () => {
		await request(app.getHttpServer())
			.delete(`/v2/works/parameters/${paramCode}/values/${paramValueCode}`)
			.expect(204);
	});

	it("DELETE /v2/works/parameters/:code — удаляет параметр", async () => {
		await request(app.getHttpServer())
			.delete(`/v2/works/parameters/${paramCode}`)
			.expect(204);
	});

	it("DELETE /v2/works/:id — удаляет тестовую работу", async () => {
		await request(app.getHttpServer())
			.delete(`/v2/works/${workId}`)
			.expect(204);
	});
});
