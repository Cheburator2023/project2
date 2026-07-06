/**
 * Общий setup для e2e-тестов.
 * Создаёт NestJS-приложение с реальной БД PostgreSQL (креды из process.env / .env).
 * Keycloak-авторизация отключена через NO_ROLES=true (GodModeGuard пропускает все запросы).
 * Схема БД — через миграции (как в dev/prod), без synchronize.
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";

let app: INestApplication;

jest.setTimeout(120_000);

beforeAll(async () => {
	process.env.NO_ROLES = "true";
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	process.env.DB_SYNCHRONIZE = "false";
	process.env.DB_MIGRATIONS_RUN = "true";

	const moduleFixture = await Test.createTestingModule({
		imports: [AppModule],
	}).compile();

	app = moduleFixture.createNestApplication();
	await app.init();
});

afterAll(async () => {
	if (app) {
		await app.close();
	}
});

export const getApp = (): INestApplication => {
	if (!app) {
		throw new Error("E2E app is not initialized — beforeAll failed");
	}
	return app;
};
