import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { getApp } from "test/setup-e2e";
import { CreateCalculationDto } from "../../src/modules/calculation/dto";

/**
 * E2e-тесты CalculationController.
 * Работают против реального NestJS-приложения с PostgreSQL через supertest.
 * Цель: проверить HTTP-контракты, статусы ответов, структуру JSON.
 */
describe("CalculationController (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		app = await getApp();
	});

	afterAll(async () => {
		await app.close();
	});

	/**
	 * POST /calculation — создание расчёта.
	 * Проверяем: 201, наличие id и calcName в ответе.
	 */
	describe("/calculation (POST)", () => {
		it("should create a new calculation", async () => {
			const createDto: CreateCalculationDto = {
				calcName: "Test Calculation",
				setupComplexity:
					"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				modelsCount: 1,
				generalUncertainty: [],
				readyPromReports: "Нет",
				dataSourcesCount: "1",
				pilotModelRequired: "Не требуется",
				algorithmComplexity: [{ algorithmType: "Табличные данные" }],
				pilotSupportRequired: "Не требуется",
				autoMlRequired: "Не требуется",
				productionAdditionalReports: "0",
				productionDeploymentChannels: ["Батч"],
				finalCoefficient: 1.0,
			};

			return request(app.getHttpServer())
				.post("/calculation")
				.send(createDto)
				.expect(201)
				.expect((res) => {
					expect(res.body).toHaveProperty("id");
					expect(res.body.calcName).toEqual(createDto.calcName);
				});
		});
	});

	/**
	 * GET /calculation/all — постраничный список.
	 * Проверяем: 200, структура {data: [], meta: {}}.
	 */
	describe("/calculation/all (GET)", () => {
		it("should return paginated calculations", () => {
			return request(app.getHttpServer())
				.get("/calculation/all")
				.query({ page: 1, limit: 10 })
				.expect(200)
				.expect((res) => {
					expect(res.body).toHaveProperty("data");
					expect(res.body).toHaveProperty("meta");
					expect(Array.isArray(res.body.data)).toBe(true);
				});
		});
	});

	/**
	 * GET /calculation/:id — получение одного расчёта.
	 * Сначала создаёт расчёт (POST), затем запрашивает по полученному id.
	 */
	describe("/calculation/:id (GET)", () => {
		it("should return a calculation by ID", async () => {
			// First create a calculation to get ID
			const createResponse = await request(app.getHttpServer())
				.post("/calculation")
				.send({
					calcName: "Test Get Calculation",
					setupComplexity:
						"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
					modelsCount: 1,
					generalUncertainty: [],
					readyPromReports: "Нет",
					dataSourcesCount: "1",
					pilotModelRequired: "Не требуется",
					algorithmComplexity: [{ algorithmType: "Табличные данные" }],
					pilotSupportRequired: "Не требуется",
					autoMlRequired: "Не требуется",
					productionAdditionalReports: "0",
					productionDeploymentChannels: ["Батч"],
					finalCoefficient: 1.0,
				});

			return request(app.getHttpServer())
				.get(`/calculation/${createResponse.body.id}`)
				.expect(200)
				.expect((res) => {
					expect(res.body.id).toEqual(createResponse.body.id);
				});
		});

		// Запрос с несуществующим ID — должен вернуть 404
		it("should return 404 for non-existent calculation", () => {
			return request(app.getHttpServer())
				.get("/calculation/550e8400-e29b-41d4-a716-446655440000")
				.expect(404);
		});
	});
});
