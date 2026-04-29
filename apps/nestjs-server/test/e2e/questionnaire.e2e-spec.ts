import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { getApp } from "test/setup-e2e";

/**
 * E2e-тесты QuestionnaireController.
 * Проверяем получение конфигурации опросника (основные поля и структура).
 * Не зависит от seed-данных — конфигурация хранится в entities.
 */
describe("QuestionnaireController (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		app = await getApp();
	});

	afterAll(async () => {
		await app.close();
	});

	/**
	 * GET /questionnaire — полная конфигурация опросника.
	 * Проверяем: 200 и наличие полей version, dictionaries, streamAverages, referenceData.
	 */
	describe("/questionnaire (GET)", () => {
		it("should return questionnaire configuration", () => {
			return request(app.getHttpServer())
				.get("/questionnaire")
				.expect(200)
				.expect((res) => {
					expect(res.body).toHaveProperty("version");
					expect(res.body).toHaveProperty("dictionaries");
					expect(res.body).toHaveProperty("streamAverages");
					expect(res.body).toHaveProperty("referenceData");
				});
		});
	});
});
