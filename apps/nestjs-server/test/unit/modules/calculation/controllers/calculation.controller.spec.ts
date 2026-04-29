import { Test, TestingModule } from "@nestjs/testing";
import { CalculationController } from "../../../../../src/modules/calculation/controllers/calculation.controller";
import { CalculationService } from "../../../../../src/modules/calculation/services/calculation.service";
import { ExcelExportService } from "../../../../../src/modules/calculation/services/excel-export.service";
import { Reflector } from "@nestjs/core";
import { CustomLogger } from "../../../../../src/shared/services/logger.service";
import { StreamMappingService } from "../../../../../src/shared/services/stream-mapping.service";
import { StreamFilterInterceptor } from "../../../../../src/shared/interceptors/stream-filter.interceptor";
import {
	Calculation,
	CalculationStatus,
} from "../../../../../src/modules/calculation/entities/calculation.entity";
import { RequestContext } from "../../../../../src/shared/decorators/request-context.decorator";
import { CreateCalculationDto } from "../../../../../src/modules/calculation/dto/request/create-calculation.dto";
import { UpdateCalculationDto } from "../../../../../src/modules/calculation/dto/request/update-calculation.dto";
import { CreateNewVersionDto } from "../../../../../src/modules/calculation/dto/request/create-new-version.dto";
import { CreateCloneDto } from "../../../../../src/modules/calculation/dto/request/create-clone.dto";
import { PaginationDto } from "../../../../../src/modules/calculation/dto/common/pagination.dto";
import { TransformedExportCalculationDto } from "../../../../../src/modules/calculation/dto/request/export-calculation.dto";
import { testCalculation } from "../../../../test-data";

const ctx: RequestContext = {
	requestId: "test-req",
	abortController: new AbortController(),
};

const user = { given_name: "Test", family_name: "User", id: "u-1" };

const sampleCalc: Calculation = {
	...testCalculation,
	status: CalculationStatus.ACTIVE,
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

/**
 * Unit-тесты CalculationController.
 * Сервис и ExcelExportService заменены полными моками.
 * Проверяем делегирование к сервису, маппинг ответов, проброс ошибок.
 */
describe("CalculationController", () => {
	let controller: CalculationController;
	let service: jest.Mocked<CalculationService>;
	let excelExportService: jest.Mocked<ExcelExportService>;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [CalculationController],
			providers: [
				{
					provide: CalculationService,
					useValue: {
						create: jest.fn().mockResolvedValue(sampleCalc),
						updateCalculation: jest.fn().mockResolvedValue(sampleCalc),
						findOne: jest.fn().mockResolvedValue(sampleCalc),
						findAll: jest.fn().mockResolvedValue([sampleCalc]),
						findAllPaginated: jest.fn().mockResolvedValue({
							data: [sampleCalc],
							meta: { total: 1, page: 1, limit: 10, lastPage: 1 },
						}),
						findAllForExport: jest.fn().mockResolvedValue([sampleCalc]),
						createNewVersion: jest.fn().mockResolvedValue(sampleCalc),
						createClone: jest.fn().mockResolvedValue(sampleCalc),
						getMaxVersionInSeries: jest.fn().mockResolvedValue("2"),
					},
				},
				{
					provide: ExcelExportService,
					useValue: {
						generateExcelFile: jest.fn().mockResolvedValue(Buffer.from("xlsx")),
					},
				},
				{
					provide: CustomLogger,
					useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
				},
				Reflector,
				StreamFilterInterceptor,
				{
					provide: StreamMappingService,
					useValue: {
						isStreamFilteredUser: jest.fn().mockReturnValue(false),
						getGroupsAfterMapping: jest.fn().mockReturnValue([]),
					},
				},
			],
		}).compile();

		controller = module.get(CalculationController);
		service = module.get(CalculationService);
		excelExportService = module.get(ExcelExportService);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	/**
	 * POST /calculation — создание расчёта.
	 */
	describe("create", () => {
		it("delegates to service.create with dto and user", async () => {
			const result = await controller.create(ctx, validCreateDto, user);
			expect(service.create).toHaveBeenCalledWith(
				validCreateDto,
				user,
				ctx.abortController.signal,
			);
			expect(result.id).toBe(sampleCalc.id);
			expect(result.calcName).toBe(sampleCalc.calcName);
		});

		it("propagates errors from service.create", async () => {
			service.create.mockRejectedValueOnce(new Error("boom"));
			await expect(
				controller.create(ctx, validCreateDto, user),
			).rejects.toThrow("boom");
		});
	});

	/**
	 * PATCH /calculation/:id — обновление расчёта.
	 */
	describe("update", () => {
		it("delegates to service.updateCalculation", async () => {
			const dto: UpdateCalculationDto = { calcName: "X" };
			const result = await controller.update(ctx, sampleCalc.id, dto, user);
			expect(service.updateCalculation).toHaveBeenCalledWith(
				sampleCalc.id,
				dto,
				user,
				ctx.abortController.signal,
			);
			expect(result.calcName).toBe(sampleCalc.calcName);
		});
	});

	/**
	 * GET /calculation/all — постраничный список с мета-информацией.
	 */
	describe("findAllPaginated", () => {
		it("returns mapped paginated response", async () => {
			const dto: PaginationDto = { page: 1, limit: 10 };
			const result = await controller.findAllPaginated(ctx, dto, user);
			expect(service.findAllPaginated).toHaveBeenCalledWith(
				dto,
				user,
				ctx.abortController.signal,
			);
			expect(result.data).toHaveLength(1);
			expect(result.meta.total).toBe(1);
		});
	});

	/**
	 * GET /calculation — все расчёты (для экспорта).
	 */
	describe("findAll", () => {
		it("returns array of mapped responses", async () => {
			const result = await controller.findAll(ctx, user);
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(sampleCalc.id);
		});
	});

	/**
	 * GET /calculation/:id — один расчёт.
	 * Дополнительно запрашивает максимальную версию серии для поля seriesLatestVersion.
	 */
	describe("findOne", () => {
		it("returns mapped single calculation", async () => {
			const result = await controller.findOne(ctx, sampleCalc.id, user);
			expect(service.findOne).toHaveBeenCalledWith(
				sampleCalc.id,
				user,
				ctx.abortController.signal,
			);
			expect(result.id).toBe(sampleCalc.id);
		});

		it("includes seriesLatestVersion when seriesId present", async () => {
			const result = await controller.findOne(ctx, sampleCalc.id, user);
			expect(service.getMaxVersionInSeries).toHaveBeenCalledWith(
				sampleCalc.seriesId,
			);
			expect(result.seriesLatestVersion).toBe("2");
		});

		it("falls back to undefined seriesLatestVersion if lookup throws", async () => {
			service.getMaxVersionInSeries.mockRejectedValueOnce(new Error("x"));
			const result = await controller.findOne(ctx, sampleCalc.id, user);
			expect(result.seriesLatestVersion).toBeUndefined();
		});
	});

	/**
	 * POST /calculation/export — экспорт в Excel.
	 * Проверяем Content-Type и запись buffer в response.end.
	 */
	describe("exportToExcel", () => {
		it("writes excel buffer to response with proper headers", async () => {
			const res: any = {
				setHeader: jest.fn(),
				end: jest.fn(),
			};
			const body: TransformedExportCalculationDto = {
				parsedFilterModel: undefined,
				parsedSortModel: undefined,
				selectedIdsArray: undefined,
			} as any;

			await controller.exportToExcel(ctx, body, user, res);
			expect(service.findAllForExport).toHaveBeenCalled();
			expect(excelExportService.generateExcelFile).toHaveBeenCalledWith([
				sampleCalc,
			]);
			expect(res.setHeader).toHaveBeenCalledWith(
				"Content-Type",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			);
			expect(res.end).toHaveBeenCalled();
		});
	});

	/**
	 * POST /calculation/:id/version — создание новой версии.
	 */
	describe("createNewVersion", () => {
		it("delegates to service.createNewVersion", async () => {
			const dto: CreateNewVersionDto = { comment: "v2" };
			const result = await controller.createNewVersion(
				ctx,
				sampleCalc.id,
				dto,
				user,
			);
			expect(service.createNewVersion).toHaveBeenCalledWith(
				sampleCalc.id,
				dto,
				user,
				ctx.abortController.signal,
			);
			expect(result.id).toBe(sampleCalc.id);
		});
	});

	/**
	 * POST /calculation/:id/clone — клонирование расчёта.
	 */
	describe("createClone", () => {
		it("delegates to service.createClone", async () => {
			const dto: CreateCloneDto = { calcName: "Clone" };
			const result = await controller.createClone(
				ctx,
				sampleCalc.id,
				dto,
				user,
			);
			expect(service.createClone).toHaveBeenCalledWith(
				sampleCalc.id,
				dto,
				user,
				ctx.abortController.signal,
			);
			expect(result.id).toBe(sampleCalc.id);
		});
	});

	/**
	 * Проброс ошибок сервиса через контроллер.
	 * Контроллер не должен глотать ошибки — они пробрасываются вверх для обработки глобальным exception filter.
	 */
	describe("error propagation", () => {
		it("update propagates service error", async () => {
			service.updateCalculation.mockRejectedValueOnce(new Error("e1"));
			await expect(
				controller.update(ctx, sampleCalc.id, {} as any, user),
			).rejects.toThrow("e1");
		});

		it("findAllPaginated propagates service error", async () => {
			service.findAllPaginated.mockRejectedValueOnce(new Error("e2"));
			await expect(
				controller.findAllPaginated(ctx, { page: 1, limit: 10 }, user),
			).rejects.toThrow("e2");
		});

		it("findAll propagates service error", async () => {
			service.findAll.mockRejectedValueOnce(new Error("e3"));
			await expect(controller.findAll(ctx, user)).rejects.toThrow("e3");
		});

		it("findOne propagates service error", async () => {
			service.findOne.mockRejectedValueOnce(new Error("e4"));
			await expect(
				controller.findOne(ctx, sampleCalc.id, user),
			).rejects.toThrow("e4");
		});

		it("exportToExcel propagates service error", async () => {
			service.findAllForExport.mockRejectedValueOnce(new Error("e5"));
			const res: any = { setHeader: jest.fn(), end: jest.fn() };
			await expect(
				controller.exportToExcel(ctx, {} as any, user, res),
			).rejects.toThrow("e5");
		});

		it("createNewVersion propagates service error", async () => {
			service.createNewVersion.mockRejectedValueOnce(new Error("e6"));
			await expect(
				controller.createNewVersion(ctx, sampleCalc.id, {} as any, user),
			).rejects.toThrow("e6");
		});

		it("createClone propagates service error", async () => {
			service.createClone.mockRejectedValueOnce(new Error("e7"));
			await expect(
				controller.createClone(ctx, sampleCalc.id, {} as any, user),
			).rejects.toThrow("e7");
		});
	});

	/**
	 * Маппинг данных entity → response DTO.
	 * Проверяем преобразование легаси-форматов generalUncertainty и productionDeploymentChannels.
	 */
	describe("response mapping", () => {
		it("maps generalUncertainty object to array form", async () => {
			service.findOne.mockResolvedValueOnce({
				...sampleCalc,
				questionnaireData: {
					...sampleCalc.questionnaireData,
					generalUncertainty: {
						sanctionsRisk: { probability: "P1", influence: "I1" },
					} as any,
				},
			});
			const result = await controller.findOne(ctx, sampleCalc.id, user);
			expect(result.questionnaireData.generalUncertainty).toEqual([
				{ type: "sanctionsRisk", probability: "P1", influence: "I1" },
			]);
		});

		it("flattens productionDeploymentChannels object form to plain strings", async () => {
			const result = await controller.findOne(ctx, sampleCalc.id, user);
			expect(result.questionnaireData.productionDeploymentChannels).toEqual([
				"Батч",
				"Батч+загрузка данных потребителю",
			]);
		});
	});
});
