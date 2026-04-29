import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { testCoefficient } from "../../../../test-data";
import { CoefficientEntity } from "../../../../../src/modules/questionnaire/entities/coefficient.entity";
import { CoefficientService } from "../../../../../src/modules/questionnaire/services/coefficient.service";

/**
 * Unit-тесты CoefficientService.
 * Репозиторий TypeORM заменён моком.
 * Проверяем поиск, очистку кода от кавычек, вычисление значений через условия/формулы/дефолт, ошибки.
 */
describe("CoefficientService", () => {
	let service: CoefficientService;
	let repository: Repository<CoefficientEntity>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				CoefficientService,
				{
					provide: getRepositoryToken(CoefficientEntity),
					useClass: Repository,
				},
			],
		}).compile();

		service = module.get<CoefficientService>(CoefficientService);
		repository = module.get<Repository<CoefficientEntity>>(
			getRepositoryToken(CoefficientEntity),
		);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	/**
	 * findAll() — возвращает все активные коэффициенты (isActive = true).
	 */
	describe("findAll", () => {
		it("should return all active coefficients", async () => {
			const result: CoefficientEntity[] = [testCoefficient];
			jest.spyOn(repository, "find").mockResolvedValue(result);

			expect(await service.findAll()).toBe(result);
			expect(repository.find).toHaveBeenCalledWith({
				where: { isActive: true },
			});
		});
	});

	/**
	 * findByCode() — поиск коэффициента по коду.
	 * Очищает кавычки сначала и в конце строки перед запросом.
	 */
	describe("findByCode", () => {
		it("should return coefficient by code", async () => {
			const code = "test";
			const result: CoefficientEntity = testCoefficient;
			jest.spyOn(repository, "findOne").mockResolvedValue(result);

			expect(await service.findByCode(code)).toBe(result);
			expect(repository.findOne).toHaveBeenCalledWith({
				where: { code, isActive: true },
			});
		});

		it("should clean code from quotes", async () => {
			const code = '"test"';
			const cleanCode = "test";
			const result: CoefficientEntity = testCoefficient;
			jest.spyOn(repository, "findOne").mockResolvedValue(result);

			expect(await service.findByCode(code)).toBe(result);
			expect(repository.findOne).toHaveBeenCalledWith({
				where: { code: cleanCode, isActive: true },
			});
		});
	});

	/**
	 * getCoefficientValue() — вычисление значения коэффициента.
	 * Логика: conditions[inputValue] → conditions.default → formula → baseValue.
	 * Если коэффициент не найден — NotFoundException.
	 */
	describe("getCoefficientValue", () => {
		it("should return base value if no conditions", async () => {
			const code = "test";
			const coefficient: CoefficientEntity = {
				...testCoefficient,
				baseValue: 1.5,
				conditions: {
					formula: undefined,
					default: undefined,
					conditions: undefined,
				},
			};
			jest.spyOn(service, "findByCode").mockResolvedValue(coefficient);
			expect(await service.getCoefficientValue(code)).toBe(1.5);
		});

		// Приоритет 1: conditions[inputValue]
		it("should return value from conditions by input", async () => {
			const code = "test";
			const inputValue = "special_case";
			const coefficient = {
				...testCoefficient,
				conditions: {
					[inputValue]: 3.0,
					formula: undefined,
					default: undefined,
					conditions: undefined,
				},
			};

			jest.spyOn(service, "findByCode").mockResolvedValue(coefficient);
			expect(await service.getCoefficientValue(code, inputValue)).toBe(3.0);
		});

		// Приоритет 2: conditions.default при отсутствии inputValue
		it("returns conditions.default when inputValue is missing", async () => {
			jest.spyOn(service, "findByCode").mockResolvedValue({
				...testCoefficient,
				conditions: { default: 7 } as any,
			});
			expect(await service.getCoefficientValue("test")).toBe(7);
		});

		// Приоритет 3: вычисление formula через eval (value подставляется из inputValue)
		it("evaluates formula with substituted value", async () => {
			jest.spyOn(service, "findByCode").mockResolvedValue({
				...testCoefficient,
				conditions: { formula: "value*2+1" } as any,
				baseValue: 0,
			});
			expect(await service.getCoefficientValue("test", "5")).toBe(11);
		});

		// Если formula невалидна — фоллбэк на baseValue
		it("falls back to baseValue when formula throws", async () => {
			jest.spyOn(service, "findByCode").mockResolvedValue({
				...testCoefficient,
				conditions: { formula: "value+(((" } as any,
				baseValue: 9,
			});
			expect(await service.getCoefficientValue("test", "1")).toBe(9);
		});

		it("returns baseValue when conditions object is empty", async () => {
			jest.spyOn(service, "findByCode").mockResolvedValue({
				...testCoefficient,
				conditions: {} as any,
				baseValue: 4,
			});
			expect(await service.getCoefficientValue("test")).toBe(4);
		});

		it("throws NotFoundException when coefficient not found", async () => {
			jest.spyOn(service, "findByCode").mockResolvedValue(null);
			await expect(service.getCoefficientValue("missing")).rejects.toThrow(
				"Coefficient with code missing not found",
			);
		});

		it("strips outer quotes from passed code", async () => {
			const spy = jest.spyOn(service, "findByCode").mockResolvedValue({
				...testCoefficient,
				conditions: { default: 1 } as any,
			});
			await service.getCoefficientValue('"q"');
			expect(spy).toHaveBeenCalledWith("q");
		});
	});
});
