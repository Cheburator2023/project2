import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { getApp } from "test/setup-e2e";

describe("QuestionnaireController (e2e)", () => {
	let app: INestApplication;

	beforeAll(async () => {
		app = await getApp();
	});

	afterAll(async () => {
		await app.close();
	});

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
