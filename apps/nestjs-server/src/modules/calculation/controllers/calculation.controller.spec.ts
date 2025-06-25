import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EntityNotFoundError } from "typeorm";
import { CalculationService } from "../../calculation/services/calculation.service";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";

describe("CalculationService", () => {
	let service: CalculationService;
	let repository: Repository<Calculation>;

	const mockCalculation: Calculation = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Test Calculation",
		questionnaireData: {
			name: "Test Calculation",
			modelsCount: 2,
			setupComplexity:
				"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
			initiativeTimeline: "Менее 1 мес.",
			initiativeCost: "45.3-438 млн.",
			uncertaintyAdjustment: 3,
			generalUncertainty: {
				planningRequirementGaps: {
					probability: "Реализация не чаще 1 раза в 10 лет",
					influence: "Незначительное",
				},
				businessProcessComplexity: {
					probability: "Реализация 1 раз в 3-10 лет",
					influence: "Существенное",
				},
			},
			readyPromReports: "Нет",
			assessedInitiativesCount: "3",
			dataSourcesCount: "4",
			pilotModelRequired: "Да",
			algorithmComplexity: [
				{ algorithmType: "Текстовая аналитика_LLM" },
				{ algorithmType: "Текстовая аналитика_Классические модели" },
			],
			pilotSupportRequired: "Да",
			autoMlRequired: "Да",
			productionAdditionalReports: "4",
			productionDeploymentChannels: [
				{ deploymentChannel: "Батч" },
				{ deploymentChannel: "Батч+загрузка данных потребителю" },
				{ deploymentChannel: "Батч + Онлайн" },
			],
		},
		finalCoefficient: 1.5,
		createdAt: new Date(),
	};

	const mockCreateDto: CreateCalculationDto = {
		name: "Test Calculation",
		modelsCount: 2,
		setupComplexity:
			"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
		initiativeTimeline: "Менее 1 мес.",
		initiativeCost: "45.3-438 млн.",
		uncertaintyAdjustment: 3,
		generalUncertainty: [
			{
				type: "planningRequirementGaps",
				probability: "Реализация не чаще 1 раза в 10 лет",
				influence: "Незначительное",
			},
			{
				type: "businessProcessComplexity",
				probability: "Реализация 1 раз в 3-10 лет",
				influence: "Существенное",
			},
		],
		readyPromReports: "Нет",
		assessedInitiativesCount: 3,
		dataSourcesCount: "4",
		pilotModelRequired: "Да",
		algorithmComplexity: [
			{ algorithmType: "Текстовая аналитика_LLM" },
			{ algorithmType: "Текстовая аналитика_Классические модели" },
		],
		pilotSupportRequired: "Да",
		autoMlRequired: "Да",
		productionAdditionalReports: 4,
		productionDeploymentChannels: [
			"Батч",
			"Батч+загрузка данных потребителю",
			"Батч + Онлайн",
		],
		finalCoefficient: 1.5,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CalculationService,
				{
					provide: getRepositoryToken(Calculation),
					useValue: {
						create: jest.fn().mockImplementation((dto) => ({
							...dto,
							id: "550e8400-e29b-41d4-a716-446655440000",
							createdAt: new Date(),
						})),
						save: jest.fn().mockResolvedValue(mockCalculation),
						findOne: jest.fn().mockResolvedValue(mockCalculation),
						findAndCount: jest.fn().mockResolvedValue([[mockCalculation], 1]),
					},
				},
			],
		}).compile();

		service = module.get<CalculationService>(CalculationService);
		repository = module.get<Repository<Calculation>>(
			getRepositoryToken(Calculation),
		);
	});

	describe("create()", () => {
		it("should successfully create a calculation", async () => {
			const result = await service.create(mockCreateDto);

			expect(result).toEqual(mockCalculation);
			expect(repository.create).toHaveBeenCalledWith({
				name: mockCreateDto.name,
				questionnaireData: {
					name: mockCreateDto.name,
					modelsCount: mockCreateDto.modelsCount,
					setupComplexity: mockCreateDto.setupComplexity,
					initiativeTimeline: mockCreateDto.initiativeTimeline,
					initiativeCost: mockCreateDto.initiativeCost,
					uncertaintyAdjustment: mockCreateDto.uncertaintyAdjustment,
					generalUncertainty: {
						planningRequirementGaps: {
							probability: "Реализация не чаще 1 раза в 10 лет",
							influence: "Незначительное",
						},
						businessProcessComplexity: {
							probability: "Реализация 1 раз в 3-10 лет",
							influence: "Существенное",
						},
					},
					readyPromReports: mockCreateDto.readyPromReports,
					assessedInitiativesCount:
						mockCreateDto.assessedInitiativesCount?.toString(),
					dataSourcesCount: mockCreateDto.dataSourcesCount,
					pilotModelRequired: mockCreateDto.pilotModelRequired,
					algorithmComplexity: mockCreateDto.algorithmComplexity,
					pilotSupportRequired: mockCreateDto.pilotSupportRequired,
					autoMlRequired: mockCreateDto.autoMlRequired,
					productionAdditionalReports:
						mockCreateDto.productionAdditionalReports?.toString(),
					productionDeploymentChannels: [
						{ deploymentChannel: "Батч" },
						{ deploymentChannel: "Батч+загрузка данных потребителю" },
						{ deploymentChannel: "Батч + Онлайн" },
					],
				},
				finalCoefficient: mockCreateDto.finalCoefficient,
			});
			expect(repository.save).toHaveBeenCalled();
		});
	});

	describe("findOne()", () => {
		it("should return a calculation by id", async () => {
			const id = "550e8400-e29b-41d4-a716-446655440000";
			const result = await service.findOne(id);
			expect(result).toEqual(mockCalculation);
			expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
		});

		it("should throw EntityNotFoundError when calculation not found", async () => {
			jest.spyOn(repository, "findOne").mockResolvedValue(null);
			const id = "550e8400-e29b-41d4-a716-446655440000";
			await expect(service.findOne(id)).rejects.toThrow(EntityNotFoundError);
		});
	});

	describe("findAllPaginated()", () => {
		it("should return paginated calculations", async () => {
			const paginationDto = { page: 1, limit: 10 };
			const expectedResult = {
				data: [mockCalculation],
				meta: {
					total: 1,
					page: 1,
					limit: 10,
					lastPage: 1,
				},
			};

			const result = await service.findAllPaginated(paginationDto);
			expect(result).toEqual(expectedResult);
			expect(repository.findAndCount).toHaveBeenCalledWith({
				skip: 0,
				take: 10,
				order: { createdAt: "DESC" },
			});
		});
	});
});
