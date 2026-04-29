/**
 * Общий setup для e2e-тестов.
 * Создаёт NestJS-приложение с реальной БД PostgreSQL (креды из .env).
 * Keycloak-авторизация отключена через NO_ROLES=true (GodModeGuard пропускает все запросы).
 * synchronize:true — автоматическая синхронизация схемы перед тестами.
 * Приложение создаётся единожды для всех сюитов (вызов getApp()).
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppModule } from "../src/app.module";

let app: INestApplication;

beforeAll(async () => {
	// Отключаем проверку Keycloak ролей и SSL-валидацию для e2e-окружения
	process.env.NO_ROLES = "true";
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

	const moduleFixture = await Test.createTestingModule({
		imports: [
			TypeOrmModule.forRoot({
				type: "postgres",
				host: process.env.DB_HOST || "localhost",
				port: Number.parseInt(process.env.DB_PORT || "5432", 10),
				username: process.env.DB_USERNAME || "postgres",
				password: process.env.DB_PASSWORD || "postgres",
				database: process.env.DB_NAME || "sumd",
				entities: ["src/**/*.entity{.ts,.js}"],
				synchronize: true,
			}),
			AppModule,
		],
	}).compile();

	app = moduleFixture.createNestApplication();
	await app.init();
});

afterAll(async () => {
	await app.close();
});

export const getApp = (): INestApplication => app;
