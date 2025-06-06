import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EntityNotFoundError } from "typeorm";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "./calculation.service";

describe("CalculationService", () => {
	let service: CalculationService;
	let repository: Repository<Calculation>;

	const mockCalculation: Calculation = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Test Calculation",
		questionnaireData: {
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

	const mockCreateDto: CreateCalculationDto = {
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
					modelsCount: mockCreateDto.modelsCount,
					setupComplexity: mockCreateDto.setupComplexity,
					initiativeTimeline: mockCreateDto.initiativeTimeline,
					initiativeCost: mockCreateDto.initiativeCost,
					generalUncertainty: mockCreateDto.generalUncertainty,
					readyPromReports: mockCreateDto.readyPromReports,
					assessedInitiativesCount: mockCreateDto.assessedInitiativesCount,
					dataSourcesCount: mockCreateDto.dataSourcesCount,
					pilotModelRequired: mockCreateDto.pilotModelRequired,
					algorithmComplexity: mockCreateDto.algorithmComplexity,
					pilotSupportRequired: mockCreateDto.pilotSupportRequired,
					autoMlRequired: mockCreateDto.autoMlRequired,
					productionAdditionalReports:
						mockCreateDto.productionAdditionalReports,
					productionDeploymentChannels:
						mockCreateDto.productionDeploymentChannels,
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
