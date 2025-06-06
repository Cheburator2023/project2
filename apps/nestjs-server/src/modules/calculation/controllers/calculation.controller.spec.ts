import { Test, TestingModule } from "@nestjs/testing";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";
import { CalculationService } from "../services/calculation.service";
import { CalculationController } from "./calculation.controller";

describe("CalculationController", () => {
	let controller: CalculationController;
	let service: CalculationService;

	const mockCalculation: Calculation = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Test Calculation",
		questionnaireData: {
			name: "Test Calculation",
			modelsCount: 5,
			setupComplexity: 3,
			initiativeTimeline: "4-10 мес.",
			initiativeCost: "45.3-438 млн.",
			generalUncertainty: {
				businessProcessComplexity: {
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
				projectSolutionDefects: {
					probability: "Реализация 1 раз в год",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
				adjacentProjectsImpact: {
					probability: "Реализация не чаще 1 раза в 10 лет",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				planningRequirementGaps: {
					probability: "Реализация 1 раз в 6 мес. или чаще",
					influence:
						"Значительный негативный эффект на возможность достижения целей проекта",
				},
				contractorPerformanceIssues: {
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
				qualifiedStaffShortage: {
					probability: "Реализация 1 раз в год",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
				sanctionsRisk: {
					probability: "Не применимо",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				controlProceduresGaps: {
					probability: "Реализация 1 раз в 1-3 года",
					influence:
						"Реализация проекта с контролируемыми отклонениями от изначальных целей",
				},
				regulatoryChanges: {
					probability: "Реализация 1 раз в 3-10 лет",
					influence:
						"Незначительное влияние на задачи и сроки достижения целей проекта",
				},
				systemUnderutilization: {
					probability: "Реализация не чаще 1 раза в 10 лет",
					influence:
						"Незначительное влияние на вторичные функции в рамках проектной деятельности",
				},
				itArchitectureChanges: {
					probability: "Реализация 1 раз в 6 мес. или чаще",
					influence:
						"Значительный негативный эффект на возможность достижения целей проекта",
				},
			},
			readyPromReports: "Да",
			assessedInitiativesCount: "3",
			dataSourcesCount: "5",
			pilotModelRequired: "Да",
			algorithmComplexity: [{ algorithmType: "Текстовая аналитика_LLM" }],
			pilotSupportRequired: "Да",
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "2",
			productionDeploymentChannels: [{ deploymentChannel: "Батч + Онлайн" }],
		},
		finalCoefficient: 1.5,
		createdAt: new Date(),
	};

	const mockPaginatedResult: PaginatedResult<Calculation> = {
		data: [mockCalculation],
		meta: {
			total: 1,
			page: 1,
			limit: 10,
			lastPage: 1,
		},
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
						findAllPaginated: jest.fn().mockResolvedValue(mockPaginatedResult),
					},
				},
			],
		}).compile();

		controller = module.get<CalculationController>(CalculationController);
		service = module.get<CalculationService>(CalculationService);
	});

	describe("create()", () => {
		it("should create a new calculation", async () => {
			const createDto: CreateCalculationDto = {
				name: "Test Calculation",
				modelsCount: 5,
				setupComplexity: 3,
				initiativeTimeline: "4-10 мес.",
				initiativeCost: "45.3-438 млн.",
				generalUncertainty: {
					businessProcessComplexity: {
						probability: "Реализация 1 раз в 1-3 года",
						influence:
							"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					},
					projectSolutionDefects: {
						probability: "Реализация 1 раз в год",
						influence:
							"Незначительное влияние на задачи и сроки достижения целей проекта",
					},
					adjacentProjectsImpact: {
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
					planningRequirementGaps: {
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence:
							"Значительный негативный эффект на возможность достижения целей проекта",
					},
					contractorPerformanceIssues: {
						probability: "Реализация 1 раз в 1-3 года",
						influence:
							"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					},
					qualifiedStaffShortage: {
						probability: "Реализация 1 раз в год",
						influence:
							"Незначительное влияние на задачи и сроки достижения целей проекта",
					},
					sanctionsRisk: {
						probability: "Не применимо",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
					controlProceduresGaps: {
						probability: "Реализация 1 раз в 1-3 года",
						influence:
							"Реализация проекта с контролируемыми отклонениями от изначальных целей",
					},
					regulatoryChanges: {
						probability: "Реализация 1 раз в 3-10 лет",
						influence:
							"Незначительное влияние на задачи и сроки достижения целей проекта",
					},
					systemUnderutilization: {
						probability: "Реализация не чаще 1 раза в 10 лет",
						influence:
							"Незначительное влияние на вторичные функции в рамках проектной деятельности",
					},
					itArchitectureChanges: {
						probability: "Реализация 1 раз в 6 мес. или чаще",
						influence:
							"Значительный негативный эффект на возможность достижения целей проекта",
					},
				},
				readyPromReports: "Да",
				assessedInitiativesCount: "3",
				dataSourcesCount: "5",
				pilotModelRequired: "Да",
				algorithmComplexity: [{ algorithmType: "Текстовая аналитика_LLM" }],
				pilotSupportRequired: "Да",
				autoMlRequired: "Не требуется",
				productionAdditionalReports: "2",
				productionDeploymentChannels: [{ deploymentChannel: "Батч + Онлайн" }],
				finalCoefficient: 1.5,
			};

			const result = await controller.create(createDto);
			expect(result).toEqual(mockCalculation);
			expect(service.create).toHaveBeenCalledWith(createDto);
		});
	});

	describe("findOne()", () => {
		it("should return a single calculation", async () => {
			const result = await controller.findOne(
				"550e8400-e29b-41d4-a716-446655440000",
			);
			expect(result).toEqual(mockCalculation);
			expect(service.findOne).toHaveBeenCalledWith(
				"550e8400-e29b-41d4-a716-446655440000",
			);
		});
	});

	describe("findAllPaginated()", () => {
		it("should return paginated calculations", async () => {
			const paginationDto = { page: 1, limit: 10 };
			const result = await controller.findAllPaginated(paginationDto);
			expect(result).toEqual(mockPaginatedResult);
			expect(service.findAllPaginated).toHaveBeenCalledWith(paginationDto);
		});
	});
});
