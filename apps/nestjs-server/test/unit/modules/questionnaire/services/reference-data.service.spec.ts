import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ReferenceDataDto } from "../../../../../src/modules/questionnaire/dto/response/reference-data.dto";
import { ReferenceDataService } from "../../../../../src/modules/questionnaire/services/reference-data.service";
import { testArtefactValue } from "../../../../test-data";
import { Repository } from "typeorm";
import { ArtefactValueEntity } from "../../../../../src/modules/questionnaire/entities/artefact-value.entity";

describe("ReferenceDataService", () => {
	let service: ReferenceDataService;
	let artefactValueRepo: Repository<ArtefactValueEntity>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				ReferenceDataService,
				{
					provide: getRepositoryToken(ArtefactValueEntity),
					useClass: Repository,
				},
			],
		}).compile();

		service = module.get<ReferenceDataService>(ReferenceDataService);
		artefactValueRepo = module.get<Repository<ArtefactValueEntity>>(
			getRepositoryToken(ArtefactValueEntity),
		);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("getReferenceData", () => {
		it("should return reference data", async () => {
			const departments = [
				{ ...testArtefactValue, artefact_value: "Dept1" },
				{ ...testArtefactValue, artefact_value: "Dept2" },
			];
			const streamExecutors = [
				{ ...testArtefactValue, artefact_id: 7, artefact_value: "Stream1" },
				{ ...testArtefactValue, artefact_id: 7, artefact_value: "Stream2" },
			];

			jest
				.spyOn(artefactValueRepo, "find")
				.mockImplementation((options: any) => {
					if (options.where.artefact_id === 6) {
						return Promise.resolve(departments);
					} else {
						return Promise.resolve(streamExecutors);
					}
				});

			const expected: ReferenceDataDto = {
				department: ["Dept1", "Dept2"],
				streamExecutor: ["Stream1", "Stream2"],
			};

			expect(await service.getReferenceData()).toEqual(expected);
		});
	});
});
