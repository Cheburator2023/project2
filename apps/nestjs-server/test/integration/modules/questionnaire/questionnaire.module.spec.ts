import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QuestionnaireModule } from "../../../../src/modules/questionnaire/questionnaire.module";
import { QuestionnaireService } from "../../../../src/modules/questionnaire/services/questionnaire.service";
import { CoefficientService } from "../../../../src/modules/questionnaire/services/coefficient.service";
import { ReferenceDataService } from "../../../../src/modules/questionnaire/services/reference-data.service";
import { QuestionnaireController } from "../../../../src/modules/questionnaire/controllers/questionnaire.controller";
import { CoefficientController } from "../../../../src/modules/questionnaire/controllers/coefficient.controller";
import { QuestionnaireItemEntity } from "../../../../src/modules/questionnaire/entities/questionnaire-item.entity";
import { CoefficientEntity } from "../../../../src/modules/questionnaire/entities/coefficient.entity";
import { StreamAverageEntity } from "../../../../src/modules/questionnaire/entities/stream-average.entity";
import { ArtefactValueEntity } from "../../../../src/modules/questionnaire/entities/artefact-value.entity";

describe("QuestionnaireModule (wiring)", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [QuestionnaireModule],
		})
			.overrideProvider(getRepositoryToken(QuestionnaireItemEntity))
			.useValue({})
			.overrideProvider(getRepositoryToken(CoefficientEntity))
			.useValue({})
			.overrideProvider(getRepositoryToken(StreamAverageEntity))
			.useValue({})
			.overrideProvider(getRepositoryToken(ArtefactValueEntity))
			.useValue({})
			.compile();
	});

	afterAll(async () => {
		await module.close();
	});

	it("registers QuestionnaireService", () => {
		expect(module.get(QuestionnaireService)).toBeDefined();
	});

	it("registers CoefficientService", () => {
		expect(module.get(CoefficientService)).toBeDefined();
	});

	it("registers ReferenceDataService", () => {
		expect(module.get(ReferenceDataService)).toBeDefined();
	});

	it("registers QuestionnaireController", () => {
		expect(module.get(QuestionnaireController)).toBeDefined();
	});

	it("registers CoefficientController", () => {
		expect(module.get(CoefficientController)).toBeDefined();
	});
});
