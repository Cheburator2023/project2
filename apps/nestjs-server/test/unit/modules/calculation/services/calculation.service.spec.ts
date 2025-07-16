import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CalculationService } from "../../../../../src/modules/calculation/services/calculation.service";
import { Calculation } from "../../../../../src/modules/calculation/entities/calculation.entity";
import { CreateCalculationDto } from "../../../../../src/modules/calculation/dto/request/create-calculation.dto";
import { PaginationDto } from "../../../../../src/modules/calculation/dto/common/pagination.dto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UpdateCalculationDto } from "../../../../../src/modules/calculation/dto/request/update-calculation.dto";

describe("CalculationService", () => {
	let service: CalculationService;
	let repository: Repository<Calculation>;

	const mockCalculation: Calculation = {
		id: "550e8400-e29b-41d4-a716-446655440000",
		name: "Test Calculation",
		rfd: "Отсутствует",
		streamExecutor: "Test Stream",
		department: ["Test Department"],
		customerName: "Test Customer",
		comment: "Test Comment",
		questionnaireData: {
			name: "Test Calculation",
			setupComplexity:
				"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
			modelsCount: 1,
			initiativeTimeline: "Менее 1 мес.",
			initiativeCost: "До 45.3 млн.",
			uncertaintyAdjustment: 1,
			generalUncertainty: [],
			readyPromReports: "Нет",
			assessedInitiativesCount: "1",
			dataSourcesCount: "1",
			pilotModelRequired: "Не требуется",
			algorithmComplexity: [{ algorithmType: "Табличные данные" }],
			pilotSupportRequired: "Не требуется",
			autoMlRequired: "Не требуется",
			productionAdditionalReports: "0",
			productionDeploymentChannels: [{ deploymentChannel: "Батч" }],
		},
		finalCoefficient: 1.0,
		createdAt: new Date(),
		author: "Test User",
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CalculationService,
				{
					provide: getRepositoryToken(Calculation),
					useValue: {
						create: jest.fn().mockReturnValue(mockCalculation),
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

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("create", () => {
		it("should successfully create a calculation", async () => {
			const createDto: CreateCalculationDto = {
				name: "Test Calculation",
				setupComplexity:
					"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				modelsCount: 1,
				generalUncertainty: [],
				readyPromReports: "Нет",
				dataSourcesCount: "1",
				pilotModelRequired: "Не требуется",
				algorithmComplexity: [{ algorithmType: "Табличные данные" }],
				pilotSupportRequired: "Не требуется",
				autoMlRequired: "Не требуется",
				productionAdditionalReports: "0",
				productionDeploymentChannels: ["Батч"],
				finalCoefficient: 1.0,
			};

			const result = await service.create(createDto, {
				given_name: "Test",
				family_name: "User",
			});
			expect(result).toEqual(mockCalculation);
			expect(repository.create).toHaveBeenCalled();
			expect(repository.save).toHaveBeenCalled();
		});

		it("should throw BadRequestException on error", async () => {
			const createDto: CreateCalculationDto = {
				name: "Test Calculation",
				setupComplexity:
					"1 Сложность: Проведение регулярной валидации Моделей Регулятором не установлено",
				initiativeTimeline: "Менее 1 мес.",
				initiativeCost: "До 45.3 млн.",
				modelsCount: 1,
				generalUncertainty: [],
				readyPromReports: "Нет",
				dataSourcesCount: "1",
				pilotModelRequired: "Не требуется",
				algorithmComplexity: [{ algorithmType: "Табличные данные" }],
				pilotSupportRequired: "Не требуется",
				autoMlRequired: "Не требуется",
				productionAdditionalReports: "0",
				productionDeploymentChannels: ["Батч"],
				finalCoefficient: 1.0,
			};

			jest.spyOn(repository, "save").mockRejectedValue(new Error("Test Error"));
			await expect(service.create(createDto, {})).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("findOne", () => {
		it("should return a calculation by ID", async () => {
			const result = await service.findOne(
				"550e8400-e29b-41d4-a716-446655440000",
			);
			expect(result).toEqual(mockCalculation);
			expect(repository.findOne).toHaveBeenCalledWith({
				where: { id: "550e8400-e29b-41d4-a716-446655440000" },
			});
		});

		it("should throw NotFoundException if calculation not found", async () => {
			jest.spyOn(repository, "findOne").mockResolvedValue(null);
			await expect(service.findOne("invalid-id")).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	describe("findAllPaginated", () => {
		it("should return paginated calculations", async () => {
			const paginationDto: PaginationDto = { page: 1, limit: 10 };
			const result = await service.findAllPaginated(paginationDto);

			expect(result.data).toEqual([mockCalculation]);
			expect(result.meta.total).toBe(1);
			expect(repository.findAndCount).toHaveBeenCalledWith({
				skip: 0,
				take: 10,
				order: { createdAt: "DESC" },
			});
		});

		it("should handle pagination errors", async () => {
			const paginationDto: PaginationDto = { page: 1, limit: 10 };
			jest
				.spyOn(repository, "findAndCount")
				.mockRejectedValue(new Error("Test Error"));
			await expect(service.findAllPaginated(paginationDto)).rejects.toThrow(
				BadRequestException,
			);
		});
	});

	describe("updateCalculation", () => {
		it("should update a calculation", async () => {
			const updateDto: UpdateCalculationDto = {
				name: "Updated Calculation",
				comment: "Updated comment",
			};

			const result = await service.updateCalculation(
				"550e8400-e29b-41d4-a716-446655440000",
				updateDto,
			);
			expect(result).toEqual(mockCalculation);
			expect(repository.findOne).toHaveBeenCalled();
			expect(repository.save).toHaveBeenCalled();
		});

		it("should throw NotFoundException if calculation not found", async () => {
			jest.spyOn(repository, "findOne").mockResolvedValue(null);
			const updateDto: UpdateCalculationDto = {
				name: "Updated Calculation",
			};
			await expect(
				service.updateCalculation("invalid-id", updateDto),
			).rejects.toThrow(NotFoundException);
		});

		it("should throw BadRequestException on other errors", async () => {
			jest
				.spyOn(repository, "findOne")
				.mockRejectedValue(new Error("Test Error"));
			const updateDto: UpdateCalculationDto = {
				name: "Updated Calculation",
			};
			await expect(
				service.updateCalculation(
					"550e8400-e29b-41d4-a716-446655440000",
					updateDto,
				),
			).rejects.toThrow(BadRequestException);
		});
	});
});
