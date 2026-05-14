import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CalculationService } from "../../../../../src/modules/calculation/services/calculation.service";
import { InMemoryFilterService } from "../../../../../src/modules/calculation/services/in-memory-filter.service";
import { Calculation } from "../../../../../src/modules/calculation/entities/calculation.entity";
import { CreateCalculationDto } from "../../../../../src/modules/calculation/dto/request/create-calculation.dto";
import { UpdateCalculationDto } from "../../../../../src/modules/calculation/dto/request/update-calculation.dto";
import { PaginationDto } from "../../../../../src/modules/calculation/dto/common/pagination.dto";
import { CreateNewVersionDto } from "../../../../../src/modules/calculation/dto/request/create-new-version.dto";
import { CreateCloneDto } from "../../../../../src/modules/calculation/dto/request/create-clone.dto";
import { CustomLogger } from "../../../../../src/shared/services/logger.service";
import { testCalculation } from "../../../../test-data";
import { CalculationStatusValues } from "@smart-anketa/api-contract";

// Глобальный мок delay.util — убираем реальные паузы при ретраях для ускорения тестов
jest.mock("../../../../../src/shared/utils/delay.util", () => ({
	delay: () => Promise.resolve(),
}));

type QueryBuilderMock = {
	leftJoinAndSelect: jest.Mock;
	where: jest.Mock;
	orderBy: jest.Mock;
	skip: jest.Mock;
	take: jest.Mock;
	getOne: jest.Mock;
	getMany: jest.Mock;
	getManyAndCount: jest.Mock;
};

// Фабрика мока TypeORM QueryBuilder — возвращает fluent-объект с jest.fn() на каждый метод
const buildQueryBuilder = (): QueryBuilderMock => {
	const qb: any = {};
	qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
	qb.where = jest.fn().mockReturnValue(qb);
	qb.orderBy = jest.fn().mockReturnValue(qb);
	qb.skip = jest.fn().mockReturnValue(qb);
	qb.take = jest.fn().mockReturnValue(qb);
	qb.getOne = jest.fn();
	qb.getMany = jest.fn();
	qb.getManyAndCount = jest.fn();
	return qb;
};

const validCreateDto: CreateCalculationDto = {
	calcName: "Test Calculation",
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

const user = {
	id: "user-1",
	given_name: "Test",
	family_name: "User",
	preferred_username: "tuser",
	email: "tuser@example.com",
};

/**
 * Unit-тесты CalculationService.
 * Все зависимости (репозиторий, InMemoryFilterService, CustomLogger) заменены моками.
 * RetryUtil работает с нулевыми задержками (delay замокан выше).
 */
describe("CalculationService", () => {
	let service: CalculationService;
	let repository: jest.Mocked<Repository<Calculation>>;
	let inMemoryFilterService: jest.Mocked<InMemoryFilterService>;
	let qb: QueryBuilderMock;

	beforeEach(async () => {
		qb = buildQueryBuilder();
		const repoMock: Partial<jest.Mocked<Repository<Calculation>>> = {
			create: jest
				.fn()
				.mockImplementation(
					(input: Partial<Calculation>) => ({ ...input }) as Calculation,
				),
			save: jest.fn().mockImplementation(async (calc) => calc),
			findOne: jest.fn().mockResolvedValue(null),
			find: jest.fn().mockResolvedValue([]),
			createQueryBuilder: jest.fn().mockReturnValue(qb) as any,
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CalculationService,
				{ provide: getRepositoryToken(Calculation), useValue: repoMock },
				{
					provide: InMemoryFilterService,
					useValue: { applyFiltersAndSort: jest.fn((items) => items) },
				},
				{
					provide: CustomLogger,
					useValue: {
						log: jest.fn(),
						warn: jest.fn(),
						error: jest.fn(),
						debug: jest.fn(),
						verbose: jest.fn(),
					},
				},
			],
		}).compile();

		service = module.get(CalculationService);
		repository = module.get(getRepositoryToken(Calculation));
		inMemoryFilterService = module.get(InMemoryFilterService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	/**
	 * create() — создание нового расчёта.
	 * Проверяем: defaults-поля, маппинг автора, валидацию алгоритмов, дублирование readableId, abort.
	 */
	describe("create", () => {
		it("creates a calculation, fills defaults and persists via repository", async () => {
			const result = await service.create(validCreateDto, user);
			expect(repository.create).toHaveBeenCalledTimes(1);
			expect(repository.save).toHaveBeenCalledTimes(1);
			expect(result.calcName).toBe(validCreateDto.calcName);
			expect(result.status).toBe(CalculationStatusValues.ACTIVE);
			expect(result.version).toBe("1");
			expect(result.seriesId).toMatch(/^\d{8}$/);
			expect(result.readableId).toBe(`Calc-${result.seriesId}-version-1`);
			expect(result.author).toBe("Test User");
			expect(result.questionnaireData.productionDeploymentChannels).toEqual([
				{ deploymentChannel: "Батч" },
			]);
		});

		it("falls back to 'Система' when no user provided", async () => {
			const result = await service.create(validCreateDto, undefined);
			expect(result.author).toBe("Система");
		});

		it("uses preferred_username when name parts are empty", async () => {
			const result = await service.create(validCreateDto, {
				preferred_username: "fallback",
			});
			expect(result.author).toBe("fallback");
		});

		// Бизнес-правило: максимум 8 типов алгоритмов
		it("throws BadRequestException when more than 8 algorithms", async () => {
			const dto: CreateCalculationDto = {
				...validCreateDto,
				algorithmComplexity: Array.from({ length: 9 }, (_, i) => ({
					algorithmType: `t${i}` as any,
				})),
			};
			await expect(service.create(dto, user)).rejects.toThrow(
				BadRequestException,
			);
		});

		// Бизнес-правило: типы алгоритмов должны быть уникальны
		it("throws BadRequestException when algorithm types contain duplicates", async () => {
			const dto: CreateCalculationDto = {
				...validCreateDto,
				algorithmComplexity: [
					{ algorithmType: "Табличные данные" },
					{ algorithmType: "Табличные данные" },
				],
			};
			await expect(service.create(dto, user)).rejects.toThrow(
				BadRequestException,
			);
		});

		it("throws BadRequestException when no algorithm types are non-empty", async () => {
			const dto: CreateCalculationDto = {
				...validCreateDto,
				algorithmComplexity: [{ algorithmType: " " as any }],
			};
			await expect(service.create(dto, user)).rejects.toThrow(
				BadRequestException,
			);
		});

		// Бизнес-правило: readableId должен быть уникальным среди активных расчётов
		it("throws BadRequestException when active calculation with same readableId exists", async () => {
			repository.findOne.mockResolvedValueOnce({ id: "x" } as Calculation);
			await expect(service.create(validCreateDto, user)).rejects.toThrow(
				BadRequestException,
			);
		});

		it("propagates abort error message when signal already aborted", async () => {
			const ctrl = new AbortController();
			ctrl.abort();
			await expect(
				service.create(validCreateDto, user, ctrl.signal as any),
			).rejects.toThrow("Request aborted by client");
		});
	});

	/**
	 * findOne() — поиск расчёта по ID.
	 */
	describe("findOne", () => {
		it("returns calculation when found", async () => {
			qb.getOne.mockResolvedValue(testCalculation);
			const result = await service.findOne(testCalculation.id, user);
			expect(result).toBe(testCalculation);
			expect(qb.where).toHaveBeenCalledWith("calculation.id = :id", {
				id: testCalculation.id,
			});
		});

		it("throws NotFoundException when missing", async () => {
			qb.getOne.mockResolvedValue(undefined);
			await expect(service.findOne("missing", user)).rejects.toThrow(
				NotFoundException,
			);
		});
	});

	/**
	 * updateCalculation() — обновление существующего расчёта.
	 * Проверяем: применение полей, синхронизацию questionnaireData, обработку ошибок.
	 */
	describe("updateCalculation", () => {
		const updateDto: UpdateCalculationDto = {
			calcName: "Updated",
			rfd: "RFD-1",
			streamExecutor: "Stream",
			department: ["Dept"],
			customerName: "Cust",
			comment: "Cmnt",
		};

		it("applies the update payload to the entity and saves", async () => {
			const found = {
				...testCalculation,
				questionnaireData: { ...testCalculation.questionnaireData },
			} as Calculation;
			qb.getOne.mockResolvedValue(found);

			const result = await service.updateCalculation(
				testCalculation.id,
				updateDto,
				user,
			);

			expect(result.calcName).toBe("Updated");
			expect(result.rfd).toBe("RFD-1");
			expect(result.streamExecutor).toBe("Stream");
			expect(result.department).toEqual(["Dept"]);
			expect(result.customerName).toBe("Cust");
			expect(result.comment).toBe("Cmnt");
			expect(result.questionnaireData.calcName).toBe("Updated");
			expect(repository.save).toHaveBeenCalledWith(found);
		});

		it("throws NotFoundException when calc absent", async () => {
			qb.getOne.mockResolvedValue(null);
			await expect(
				service.updateCalculation("missing", updateDto, user),
			).rejects.toThrow(NotFoundException);
		});

		// Неожиданные ошибки БД должны оборачиваться в BadRequestException
		it("wraps unexpected save error in BadRequestException", async () => {
			qb.getOne.mockResolvedValue({ ...testCalculation } as Calculation);
			repository.save.mockRejectedValue(new Error("boom"));
			await expect(
				service.updateCalculation(testCalculation.id, updateDto, user),
			).rejects.toThrow(BadRequestException);
		});
	});

	/**
	 * findAllPaginated() — постраничный список расчётов.
	 */
	describe("findAllPaginated", () => {
		it("returns paginated data with correct meta", async () => {
			qb.getManyAndCount.mockResolvedValue([[testCalculation], 25]);
			const dto: PaginationDto = { page: 2, limit: 10 };
			const result = await service.findAllPaginated(dto, user);
			expect(qb.skip).toHaveBeenCalledWith(10);
			expect(qb.take).toHaveBeenCalledWith(10);
			expect(result.data).toEqual([testCalculation]);
			expect(result.meta).toEqual({
				total: 25,
				page: 2,
				limit: 10,
				lastPage: 3,
			});
		});

		it("wraps repository errors in BadRequestException", async () => {
			qb.getManyAndCount.mockRejectedValue(new Error("db fail"));
			await expect(
				service.findAllPaginated({ page: 1, limit: 10 }, user),
			).rejects.toThrow(BadRequestException);
		});
	});

	describe("findAll", () => {
		it("returns all calculations", async () => {
			qb.getMany.mockResolvedValue([testCalculation]);
			const result = await service.findAll(user);
			expect(result).toEqual([testCalculation]);
		});

		it("wraps repository errors in BadRequestException", async () => {
			qb.getMany.mockRejectedValue(new Error("db fail"));
			await expect(service.findAll(user)).rejects.toThrow(BadRequestException);
		});
	});

	/**
	 * findAllForExport() — получение данных для Excel-экспорта.
	 * Может фильтровать по списку ID или загружать все записи.
	 */
	describe("findAllForExport", () => {
		it("uses IN-clause when selectedIds provided", async () => {
			qb.getMany.mockResolvedValue([testCalculation]);
			const result = await service.findAllForExport(
				user,
				undefined,
				undefined,
				["id-1"],
			);
			expect(qb.where).toHaveBeenCalledWith(
				"calculation.id IN (:...selectedIds)",
				{ selectedIds: ["id-1"] },
			);
			expect(inMemoryFilterService.applyFiltersAndSort).toHaveBeenCalled();
			expect(result).toEqual([testCalculation]);
		});

		it("loads all when selectedIds empty", async () => {
			qb.getMany.mockResolvedValue([testCalculation]);
			await service.findAllForExport(user, undefined, undefined, []);
			expect(qb.where).not.toHaveBeenCalled();
		});

		it("propagates repository errors", async () => {
			qb.getMany.mockRejectedValue(new Error("boom"));
			await expect(service.findAllForExport(user)).rejects.toThrow("boom");
		});
	});

	/**
	 * getMaxVersionInSeries() — нахождение максимального номера версии в серии.
	 */
	describe("getMaxVersionInSeries", () => {
		it("returns '0' when no records", async () => {
			repository.find.mockResolvedValue([]);
			expect(await service.getMaxVersionInSeries("S")).toBe("0");
		});

		it("returns the max numeric version", async () => {
			repository.find.mockResolvedValue([
				{ version: "1" } as Calculation,
				{ version: "5" } as Calculation,
				{ version: "3" } as Calculation,
			]);
			expect(await service.getMaxVersionInSeries("S")).toBe("5");
		});
	});

	/**
	 * createNewVersion() — создание новой версии расчёта.
	 * Архивирует предыдущую активную версию, присваивает следующий номер.
	 */
	describe("createNewVersion", () => {
		const dto: CreateNewVersionDto = { comment: "v2" };

		it("creates next version, archives previous active calc and saves", async () => {
			const source = {
				...testCalculation,
				seriesId: "11111111",
				version: "1",
				status: CalculationStatusValues.ACTIVE,
			} as Calculation;
			qb.getOne.mockResolvedValue(source);
			repository.find
				.mockResolvedValueOnce([{ version: "1" } as Calculation]) // getMaxVersionInSeries
				.mockResolvedValueOnce([source]); // archivePrevious
			repository.findOne.mockResolvedValue(null); // ensureReadableIdIsUnique

			const result = await service.createNewVersion(source.id, dto, user);

			expect(result.version).toBe("2");
			expect(result.parentCalcId).toBe(source.id);
			expect(result.seriesId).toBe(source.seriesId);
			expect(result.readableId).toBe(`Calc-${source.seriesId}-version-2`);
			// archived (1 source) + saved new = 2 saves
			expect(repository.save).toHaveBeenCalledTimes(2);
		});

		it("rethrows NotFoundException from findOne", async () => {
			qb.getOne.mockResolvedValue(null);
			await expect(
				service.createNewVersion("missing", dto, user),
			).rejects.toThrow(NotFoundException);
		});

		// Если в DTO передан calculationResult — он мержится в questionnaireData новой версии
		it("merges calculationResult into questionnaireData when provided", async () => {
			const source = {
				...testCalculation,
				seriesId: null,
			} as Calculation;
			qb.getOne.mockResolvedValue(source);
			repository.findOne.mockResolvedValue(null);
			const result = await service.createNewVersion(
				source.id,
				{
					calculationResult: [{ stageName: "01", score: 5 } as any],
				} as any,
				user,
			);
			expect(result.questionnaireData.calculationResult).toEqual([
				{
					stageName: "01",
					score: 5,
					stageBaseValue: undefined,
					percentFromAverage: undefined,
					offset: undefined,
					disabled: undefined,
				},
			]);
		});

		it("wraps unexpected errors in BadRequestException", async () => {
			const source = {
				...testCalculation,
				seriesId: null,
			} as Calculation;
			qb.getOne.mockResolvedValue(source);
			repository.findOne.mockResolvedValue(null);
			repository.save.mockRejectedValue(new Error("kaboom"));
			await expect(
				service.createNewVersion(source.id, dto, user),
			).rejects.toThrow(BadRequestException);
		});
	});

	/**
	 * createClone() — клонирование расчёта в новую независимую серию.
	 * Клон получает новый seriesId, version=1, parentCalcId=null.
	 */
	describe("createClone", () => {
		const dto: CreateCloneDto = { calcName: "Clone" };

		it("clones with new seriesId, version=1 and parentCalcId=null", async () => {
			const source = {
				...testCalculation,
				seriesId: "11111111",
				version: "3",
			} as Calculation;
			qb.getOne.mockResolvedValue(source);
			repository.findOne.mockResolvedValue(null);

			const result = await service.createClone(source.id, dto, user);
			expect(result.calcName).toBe("Clone");
			expect(result.parentCalcId).toBeNull();
			expect(result.version).toBe("1");
			expect(result.seriesId).not.toBe(source.seriesId);
			expect(result.readableId).toBe(`Calc-${result.seriesId}-version-1`);
		});

		it("rethrows NotFoundException when source missing", async () => {
			qb.getOne.mockResolvedValue(null);
			await expect(service.createClone("missing", dto, user)).rejects.toThrow(
				NotFoundException,
			);
		});

		it("merges calculationResult into cloned questionnaireData when provided", async () => {
			const source = { ...testCalculation } as Calculation;
			qb.getOne.mockResolvedValue(source);
			repository.findOne.mockResolvedValue(null);
			const result = await service.createClone(
				source.id,
				{
					calculationResult: [{ stageName: "01", score: 1 } as any],
				} as any,
				user,
			);
			expect(result.questionnaireData.calculationResult).toBeDefined();
		});

		it("wraps unexpected errors in BadRequestException", async () => {
			const source = { ...testCalculation } as Calculation;
			qb.getOne.mockResolvedValue(source);
			repository.findOne.mockResolvedValue(null);
			repository.save.mockRejectedValue(new Error("clone-fail"));
			await expect(service.createClone(source.id, dto, user)).rejects.toThrow(
				BadRequestException,
			);
		});
	});
});
