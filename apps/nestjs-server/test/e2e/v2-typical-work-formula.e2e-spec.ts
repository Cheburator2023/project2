import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { getApp } from "test/setup-e2e";

const STREAM = "Источники данных";

/**
 * E2e: типовые работы — создание, норма, превью расчёта по формуле H.
 */
describe("V2TypicalWork formula (e2e)", () => {
	let app: INestApplication;
	let workId: string;

	beforeAll(async () => {
		app = await getApp();
	});

	afterAll(async () => {
		await app.close();
	});

	it("POST /v2/works — создаёт работу с формулой H по умолчанию", async () => {
		const res = await request(app.getHttpServer())
			.post("/v2/works")
			.send({
				name: `E2E formula test ${Date.now()}`,
				archComponentType: "Система-источник",
			})
			.expect(201);

		workId = res.body.id;
		expect(res.body.formula).toEqual({
			tokens: [{ kind: "norm" }],
			text: "H",
		});
		expect(res.body.rounding).toEqual({ mode: "CEIL", step: 0.1 });
	});

	it("PATCH /v2/works/:id — сохраняет норму для стрима", async () => {
		await request(app.getHttpServer())
			.patch(`/v2/works/${workId}`)
			.send({
				streamExecutor: STREAM,
				norms: [
					{
						normValue: 2.5,
						validFrom: "2025-01-01",
					},
				],
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.norms).toHaveLength(1);
				expect(Number(res.body.norms[0].normValue)).toBe(2.5);
			});
	});

	it("POST /v2/works/:id/preview — считает H с округлением вверх", async () => {
		await request(app.getHttpServer())
			.post(`/v2/works/${workId}/preview`)
			.send({
				streamExecutor: STREAM,
				atDate: "2025-06-01",
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.error).toBeNull();
				expect(res.body.formulaSymbolic).toMatch(/H/);
				expect(res.body.result).toBe(2.5);
			});
	});

	it("DELETE /v2/works/:id — удаляет тестовую работу", async () => {
		await request(app.getHttpServer())
			.delete(`/v2/works/${workId}`)
			.expect(204);
	});
});
