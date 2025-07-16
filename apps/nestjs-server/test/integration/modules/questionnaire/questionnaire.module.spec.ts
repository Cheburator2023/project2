import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { QuestionnaireModule } from "../../../../src/modules/questionnaire/questionnaire.module";
import { QuestionnaireItemEntity } from "../../../../src/modules/questionnaire/entities/questionnaire-item.entity";
import { CoefficientEntity } from "../../../../src/modules/questionnaire/entities/coefficient.entity";
import { StreamAverageEntity } from "../../../../src/modules/questionnaire/entities/stream-average.entity";
import { ArtefactValueEntity } from "../../../../src/modules/questionnaire/entities/artefact-value.entity";

describe("QuestionnaireModule", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [
				TypeOrmModule.forRoot({
					type: "sqlite",
					database: ":memory:",
					entities: [
						QuestionnaireItemEntity,
						CoefficientEntity,
						StreamAverageEntity,
						ArtefactValueEntity,
					],
					synchronize: true,
				}),
				QuestionnaireModule,
			],
		}).compile();
	});

	it("should be defined", () => {
		expect(module).toBeDefined();
	});

	it("should have QuestionnaireService", () => {
		const service = module.get("QuestionnaireService");
		expect(service).toBeDefined();
	});

	it("should have CoefficientService", () => {
		const service = module.get("CoefficientService");
		expect(service).toBeDefined();
	});

	it("should have ReferenceDataService", () => {
		const service = module.get("ReferenceDataService");
		expect(service).toBeDefined();
	});

	it("should have QuestionnaireController", () => {
		const controller = module.get("QuestionnaireController");
		expect(controller).toBeDefined();
	});

	it("should have CoefficientController", () => {
		const controller = module.get("CoefficientController");
		expect(controller).toBeDefined();
	});
});
