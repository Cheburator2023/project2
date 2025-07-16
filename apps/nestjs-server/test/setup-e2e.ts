import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppModule } from "src/app.module";

let app: INestApplication;

beforeAll(async () => {
	const moduleFixture = await Test.createTestingModule({
		imports: [
			TypeOrmModule.forRoot({
				type: "postgres",
				host: "localhost",
				port: 5430,
				username: "test",
				password: "test",
				database: "test_db",
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
