import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { CreateCalculationDto } from "../dto/request/create-calculation.dto";
import { CalculationResponseDto } from "../dto/response/calculation-response.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "../services/calculation.service";
import { CalculationController } from "./calculation.controller";

describe("CalculationController", () => {
	let controller: CalculationController;
	let service: CalculationService;

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

	const mockResponseDto: CalculationResponseDto = {
		id: mockCalculation.id,
		name: mockCalculation.name,
		rfd: mockCalculation.rfd,
		streamExecutor: mockCalculation.streamExecutor,
		department: mockCalculation.department,
		customerName: mockCalculation.customerName,
		comment: mockCalculation.comment,
		questionnaireData: mockCalculation.questionnaireData,
		finalCoefficient: mockCalculation.finalCoefficient,
		createdAt: mockCalculation.createdAt,
		author: mockCalculation.author,
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [CalculationController],
			providers: [
				{
					provide: CalculationService,
					useValue: {
						create: jest.fn().mockResolvedValue(mockCalculation),
						findOne: jest.fn().mockResolvedValue(mockCalculation),
						findAllPaginated: jest.fn().mockResolvedValue({
							data: [mockCalculation],
							meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
						}),
						findAll: jest.fn().mockResolvedValue([mockCalculation]),
					},
				},
			],
		}).compile();

		controller = module.get<CalculationController>(CalculationController);
		service = module.get<CalculationService>(CalculationService);
	});

	describe("create()", () => {
		it("should create a calculation and return response DTO", async () => {
			const result = await controller.create(mockCreateDto, mockUser);
			expect(result).toEqual(mockResponseDto);
			expect(service.create).toHaveBeenCalledWith(mockCreateDto, mockUser);
		});

		it("should handle service errors", async () => {
			jest
				.spyOn(service, "create")
				.mockRejectedValue(new BadRequestException("Validation failed"));
			await expect(controller.create(mockCreateDto, mockUser)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("findAllPaginated()", () => {
		it("should return paginated calculations", async () => {
			const paginationDto = { page: 1, limit: 10 };
			const expectedResult = {
				data: [mockResponseDto],
				meta: {
					total: 1,
					page: 1,
					limit: 10,
					lastPage: 1,
				},
			};

			const result = await controller.findAllPaginated(paginationDto);
			expect(result).toEqual(expectedResult);
			expect(service.findAllPaginated).toHaveBeenCalledWith(paginationDto);
		});
	});

	describe("findAll()", () => {
		it("should return all calculations", async () => {
			const result = await controller.findAll();
			expect(result).toEqual([mockResponseDto]);
			expect(service.findAll).toHaveBeenCalled();
		});
	});

	describe("findOne()", () => {
		it("should return a calculation by id", async () => {
			const id = "550e8400-e29b-41d4-a716-446655440000";
			const result = await controller.findOne(id);
			expect(result).toEqual(mockResponseDto);
			expect(service.findOne).toHaveBeenCalledWith(id);
		});

		it("should handle not found errors", async () => {
			const id = "550e8400-e29b-41d4-a716-446655440000";
			jest
				.spyOn(service, "findOne")
				.mockRejectedValue(new NotFoundException("Calculation not found"));

			await expect(controller.findOne(id)).rejects.toThrow(NotFoundException);
		});
	});
});
