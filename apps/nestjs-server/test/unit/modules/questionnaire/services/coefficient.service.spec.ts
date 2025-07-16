import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { testCoefficient } from "../../../../test-data";
import { CoefficientEntity } from "../../../../../src/modules/questionnaire/entities/coefficient.entity";
import { CoefficientService } from "../../../../../src/modules/questionnaire/services/coefficient.service";

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
	});
});
