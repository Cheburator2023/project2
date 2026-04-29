import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * E2e-тест AppModule.
 * Проверяет запуск приложения с полным AppModule (реальная БД через supertest).
 * Использует beforeEach/afterEach (перезапуск приложения на каждый тест).
 */
describe("AppController (e2e)", () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	it("/questionnaire (GET) should return questionnaire data", () => {
		return request(app.getHttpServer())
			.get("/questionnaire")
			.expect(200)
			.expect((res) => {
				expect(res.body).toBeDefined();
			});
	});
});
