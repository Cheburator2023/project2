import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateCalculationDto } from "../dto/request/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "./calculation.service";

describe("CalculationService", () => {
	let service: CalculationService;
	let repository: Repository<Calculation>;

	const mockUser = {
		id: "user-123",
		email: "test@example.com",
		given_name: "Test",
		family_name: "User",
	};

	const mockCalculation: Calculation = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Test Calculation",
		rfd: "RFD-20250001",
		streamExecutor: "Стрим 1",
		department: ["Департамент 1"],
		customerName: "Иванов И.И.",
		comment: "Тестовый комментарий",
		questionnaireData: {
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
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				{
					type: "businessProcessComplexity",
					probability: "Реализация 1 раз в 3-10 лет",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
			],
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
			],
		},
		finalCoefficient: 1.5,
		createdAt: new Date(),
		author: "Test User",
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
				influence:
					"Незначительное влияние на вторичные функции в рамках проектной деятельности",
			},
			{
				type: "businessProcessComplexity",
				probability: "Реализация 1 раз в 3-10 лет",
				influence:
					"Незначительное влияние на задачи и сроки достижения целей проекта",
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
		productionAdditionalReports: "4",
		productionDeploymentChannels: ["Батч", "Батч+загрузка данных потребителю"],
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
							author: "Test User",
						})),
						save: jest.fn().mockResolvedValue(mockCalculation),
						findOne: jest.fn().mockResolvedValue(mockCalculation),
						findAndCount: jest.fn().mockResolvedValue([[mockCalculation], 1]),
						find: jest.fn().mockResolvedValue([mockCalculation]),
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
			const result = await service.create(mockCreateDto, mockUser);

			expect(result).toEqual(mockCalculation);
			expect(repository.create).toHaveBeenCalledWith({
				name: mockCreateDto.name,
				rfd: "Отсутствует",
				questionnaireData: {
					name: mockCreateDto.name,
					modelsCount: mockCreateDto.modelsCount,
					setupComplexity: mockCreateDto.setupComplexity,
					initiativeTimeline: mockCreateDto.initiativeTimeline,
					initiativeCost: mockCreateDto.initiativeCost,
					uncertaintyAdjustment: mockCreateDto.uncertaintyAdjustment,
					generalUncertainty: {
						planningRequirementGaps: {
							probability: mockCreateDto.generalUncertainty[0].probability,
							influence: mockCreateDto.generalUncertainty[0].influence,
						},
						businessProcessComplexity: {
							probability: mockCreateDto.generalUncertainty[1].probability,
							influence: mockCreateDto.generalUncertainty[1].influence,
						},
					},
					readyPromReports: mockCreateDto.readyPromReports,
					assessedInitiativesCount:
						mockCreateDto.assessedInitiativesCount?.toString() ?? undefined,
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
					],
				},
				finalCoefficient: mockCreateDto.finalCoefficient,
				author: "Test User",
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

		it("should throw NotFoundException when calculation not found", async () => {
			jest.spyOn(repository, "findOne").mockResolvedValue(null);
			const id = "550e8400-e29b-41d4-a716-446655440000";
			await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
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

		it("should throw BadRequestException when pagination fails", async () => {
			const error = new Error("Database error");
			jest.spyOn(repository, "findAndCount").mockRejectedValue(error);

			await expect(
				service.findAllPaginated({ page: 1, limit: 10 }),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("findAll()", () => {
		it("should return all calculations", async () => {
			const result = await service.findAll();
			expect(result).toEqual([mockCalculation]);
			expect(repository.find).toHaveBeenCalledWith({
				order: { createdAt: "DESC" },
			});
		});

		it("should throw BadRequestException when fetch fails", async () => {
			const error = new Error("Database error");
			jest.spyOn(repository, "find").mockRejectedValue(error);

			await expect(service.findAll()).rejects.toThrow(BadRequestException);
		});
	});
});
