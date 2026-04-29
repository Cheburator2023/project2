import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { getApp } from "test/setup-e2e";

/**
 * E2e-тесты CoefficientController.
 * Работают против реального NestJS-приложения с PostgreSQL.
 * Тест на получение значения по коду помечен как skip — требует seed-данные в БД.
 */
describe("CoefficientController (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		app = await getApp();
	});

	afterAll(async () => {
		await app.close();
	});

	/**
	 * GET /questionnaire/coefficients — список всех активных коэффициентов.
	 * Проверяем: 200 и что body является массивом (даже пустым).
	 */
	describe("/questionnaire/coefficients (GET)", () => {
		it("should return an array of coefficients", () => {
			return request(app.getHttpServer())
				.get("/questionnaire/coefficients")
				.expect(200)
				.expect((res) => {
					expect(Array.isArray(res.body)).toBe(true);
				});
		});
	});

	/**
	 * GET /questionnaire/coefficients/:code — получение значения по коду.
	 */
	describe("/questionnaire/coefficients/:code (GET)", () => {
		// NOTE: This test requires seed coefficient data in DB
		it.skip("should return coefficient value", () => {
			const code = "test";
			return request(app.getHttpServer())
				.get(`/questionnaire/coefficients/${code}`)
				.query({ value: "1" })
				.expect(200)
				.expect((res) => {
					expect(typeof res.body).toBe("number");
				});
		});

		it("should return 404 if coefficient not found", () => {
			const code = "not-found";
			return request(app.getHttpServer())
				.get(`/questionnaire/coefficients/${code}`)
				.expect(404);
		});
	});
});
