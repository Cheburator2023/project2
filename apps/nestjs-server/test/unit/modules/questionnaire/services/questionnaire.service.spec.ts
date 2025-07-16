import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { QuestionnaireService } from "../../../../../src/modules/questionnaire/services/questionnaire.service";
import { ReferenceDataService } from "../../../../../src/modules/questionnaire/services/reference-data.service";
import { QuestionnaireItemEntity } from "../../../../../src/modules/questionnaire/entities/questionnaire-item.entity";
import { CoefficientEntity } from "../../../../../src/modules/questionnaire/entities/coefficient.entity";
import { StreamAverageEntity } from "../../../../../src/modules/questionnaire/entities/stream-average.entity";
import {
	testQuestionnaireItem,
	testCoefficient,
	testStreamAverage,
} from "../../../../test-data";

describe("QuestionnaireService", () => {
	let service: QuestionnaireService;
	let questionnaireItemRepo: Repository<QuestionnaireItemEntity>;
	let coefficientRepo: Repository<CoefficientEntity>;
	let streamAverageRepo: Repository<StreamAverageEntity>;
	let _referenceDataService: ReferenceDataService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				QuestionnaireService,
				{
					provide: getRepositoryToken(QuestionnaireItemEntity),
					useValue: {
						find: jest.fn(),
						findOne: jest.fn().mockImplementation((options) => {
							if (options.where.code === "generalUncertainty") {
								return Promise.resolve({
									...testQuestionnaireItem,
									fieldType: "risk",
									options: [{ value: "5.1", label: "Risk 1" }],
								});
							}
							return Promise.resolve(testQuestionnaireItem);
						}),
					},
				},
				{
					provide: getRepositoryToken(CoefficientEntity),
					useValue: {
						find: jest.fn().mockImplementation((options) => {
							if (options.where.code === "risk_%") {
								return Promise.resolve([
									{
										...testCoefficient,
										code: "risk_5_1",
										baseValue: 1.0,
										conditions: {
											conditions: [{ field: "test", value: "test" }],
										},
									},
								]);
							}
							return Promise.resolve([
								{
									...testCoefficient,
									code: "test_item_1",
									baseValue: 1.0,
								},
							]);
						}),
					},
				},
				{
					provide: getRepositoryToken(StreamAverageEntity),
					useValue: {
						find: jest.fn().mockResolvedValue([testStreamAverage]),
					},
				},
				{
					provide: ReferenceDataService,
					useValue: {
						getReferenceData: jest.fn().mockResolvedValue({
							department: ["Dept1"],
							streamExecutor: ["Stream1"],
						}),
					},
				},
			],
		}).compile();

		service = module.get<QuestionnaireService>(QuestionnaireService);
		questionnaireItemRepo = module.get<Repository<QuestionnaireItemEntity>>(
			getRepositoryToken(QuestionnaireItemEntity),
		);
		coefficientRepo = module.get<Repository<CoefficientEntity>>(
			getRepositoryToken(CoefficientEntity),
		);
		streamAverageRepo = module.get<Repository<StreamAverageEntity>>(
			getRepositoryToken(StreamAverageEntity),
		);
		_referenceDataService =
			module.get<ReferenceDataService>(ReferenceDataService);
	});

	describe("getFullQuestionnaire", () => {
		it("should handle risk items correctly", async () => {
			const riskItem = {
				...testQuestionnaireItem,
				code: "generalUncertainty",
				fieldType: "risk",
				options: [
					{ value: "5.1", label: "Risk 1", hint: "Risk description 1" },
				],
			};

			jest.spyOn(questionnaireItemRepo, "find").mockResolvedValue([riskItem]);

			const result = await service.getFullQuestionnaire();
			expect(result.dictionaries.generalUncertainty).toBeDefined();
		});

		it("should handle select/multiselect items correctly", async () => {
			const selectItem = {
				...testQuestionnaireItem,
				fieldType: "select",
				options: [{ value: 1, label: "Option 1" }],
			};

			jest.spyOn(questionnaireItemRepo, "find").mockResolvedValue([selectItem]);
			jest.spyOn(coefficientRepo, "find").mockResolvedValue([
				{
					...testCoefficient,
					code: "test_item_1",
					baseValue: 1.0,
				},
			]);

			const result = await service.getFullQuestionnaire();
			expect(result.dictionaries.test_item[0].coefficient).toBe(1.0);
		});
	});

	describe("getQuestionnaireItemByCode", () => {
		it("should return questionnaire item by code", async () => {
			const code = "test_item";
			const item = testQuestionnaireItem;
			jest.spyOn(questionnaireItemRepo, "findOne").mockResolvedValue(item);

			const result = await service.getQuestionnaireItemByCode(code);
			expect(result).toBe(item);
			expect(questionnaireItemRepo.findOne).toHaveBeenCalledWith({
				where: { code, isActive: true },
				relations: ["coefficients"],
			});
		});
	});

	describe("getAllActiveItems", () => {
		it("should return all active items ordered", async () => {
			const items = [testQuestionnaireItem];
			jest.spyOn(questionnaireItemRepo, "find").mockResolvedValue(items);

			const result = await service.getAllActiveItems();
			expect(result).toBe(items);
			expect(questionnaireItemRepo.find).toHaveBeenCalledWith({
				where: { isActive: true },
				order: { order: "ASC" },
				relations: ["coefficients"],
			});
		});
	});

	describe("getCoefficientsForItem", () => {
		it("should return coefficients for item", async () => {
			const itemCode = "test_item";
			const coefficients = [testCoefficient];
			jest.spyOn(coefficientRepo, "find").mockResolvedValue(coefficients);

			const result = await service.getCoefficientsForItem(itemCode);
			expect(result).toBe(coefficients);
			expect(coefficientRepo.find).toHaveBeenCalledWith({
				where: { code: `${itemCode}_%`, isActive: true },
			});
		});
	});

	describe("getStreamAverages", () => {
		it("should return stream averages", async () => {
			const averages = [testStreamAverage];
			jest.spyOn(streamAverageRepo, "find").mockResolvedValue(averages);

			const result = await service.getStreamAverages();
			expect(result["01. Test Epic"]).toBe(10.5);
		});
	});
});
