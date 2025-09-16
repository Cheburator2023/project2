import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Res,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { StreamFilter } from "../../../shared/decorators/stream-filter.decorator";
import { CurrentUser } from "../../../shared/decorators/user.decorator";
import { StreamFilterInterceptor } from "../../../shared/interceptors/stream-filter.interceptor";
import { Permission } from "../../../shared/types/permissions";
import {
	CalculationResponseDto,
	CreateCalculationDto,
	PaginatedCalculationResponseDto,
	PaginationDto,
	TransformedExportCalculationDto,
} from "../dto";
import { UpdateCalculationDto } from "../dto/request/update-calculation.dto";
import { CalculationService } from "../services/calculation.service";
import { Calculation } from "../entities/calculation.entity";
import { ExcelExportService } from "../services/excel-export.service";
import { Response } from "express";
import { ExportValidationPipe } from "../pipe/export-validation.pipe";
import { JsonValidationPipe } from "../pipe/json-validation.pipe";
import { CustomLogger } from "../../../shared/services/logger.service";
import {
	ReqContext,
	RequestContext,
} from "../../../shared/decorators/request-context.decorator";
import { CreateNewVersionDto } from "../dto/request/create-new-version.dto";
import { CreateCloneDto } from "../dto/request/create-clone.dto";

@ApiBearerAuth("JWT-auth")
@ApiTags("Calculation")
@Controller("calculation")
@UseInterceptors(StreamFilterInterceptor)
export class CalculationController {
	private activeRequests = new Map<string, AbortController>();

	constructor(
		private readonly calculationService: CalculationService,
		private readonly excelExportService: ExcelExportService,
		private readonly customLogger: CustomLogger,
	) {}

	@Post()
	@RealmRole(Permission.ANKETA_CREATE_CALCULATION)
	@UsePipes(JsonValidationPipe)
	@ApiOperation({
		summary: "Создать новый расчет",
		description: "Создает новый расчет с предоставленными данными",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Расчет успешно создан.",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Неверный запрос. Ошибка валидации.",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async create(
		@ReqContext() ctx: RequestContext,
		@Body() createCalculationDto: CreateCalculationDto,
		@CurrentUser() user: any,
	): Promise<CalculationResponseDto> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				"Начало создания расчета",
				"CalculationController.create",
				{
					requestId: ctx.requestId,
					userId: user?.id,
					mdc: {
						method: "POST",
						path: "/calculation",
						userId: user?.id,
					},
				},
			);

			const calculation = await this.calculationService.create(
				createCalculationDto,
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				"Расчет успешно создан",
				"CalculationController.create",
				{
					requestId: ctx.requestId,
					calculationId: calculation.id,
				},
			);

			return await this.mapToResponseDto(calculation);
		} catch (error) {
			this.customLogger.error(
				"Ошибка при создании расчета",
				error.stack,
				"CalculationController.create",
				{
					requestId: ctx.requestId,
					error: error.message,
					dto: createCalculationDto,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Put(":id")
	@StreamFilter()
	@RealmRole(Permission.ANKETA_EDIT_CALCULATION)
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	@ApiOperation({
		summary: "Обновить основную информацию расчета",
		description: "Обновляет основную информацию существующего расчета",
	})
	@ApiParam({
		name: "id",
		description: "Уникальный идентификатор расчета",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Расчет успешно обновлен.",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Неверный запрос. Ошибка валидации.",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Расчет не найден.",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async update(
		@ReqContext() ctx: RequestContext,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() updateCalculationDto: UpdateCalculationDto,
		@CurrentUser() user: any,
	): Promise<CalculationResponseDto> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				"Начало обновления расчета",
				"CalculationController.update",
				{
					requestId: ctx.requestId,
					userId: user?.id,
					mdc: {
						method: "PUT",
						path: `/calculation/${id}`,
						userId: user?.id,
					},
				},
			);

			const calculation = await this.calculationService.updateCalculation(
				id,
				updateCalculationDto,
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				"Расчет успешно обновлен",
				"CalculationController.update",
				{
					requestId: ctx.requestId,
					calculationId: id,
				},
			);

			return await this.mapToResponseDto(calculation);
		} catch (error) {
			this.customLogger.error(
				"Ошибка при обновлении расчета",
				error.stack,
				"CalculationController.update",
				{
					requestId: ctx.requestId,
					calculationId: id,
					error: error.message,
					dto: updateCalculationDto,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Get("all")
	@StreamFilter()
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Получить все расчеты (с пагинацией)",
		description: "Возвращает пагинированный список всех расчетов",
	})
	@ApiQuery({
		name: "page",
		required: false,
		type: Number,
		description: "Номер страницы (начиная с 1)",
		example: 1,
	})
	@ApiQuery({
		name: "limit",
		required: false,
		type: Number,
		description: "Количество элементов на странице (максимум 100)",
		example: 10,
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Пагинированный список расчетов",
		type: PaginatedCalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async findAllPaginated(
		@ReqContext() ctx: RequestContext,
		@Query() paginationDto: PaginationDto,
		@CurrentUser() user: any,
	): Promise<PaginatedCalculationResponseDto> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				"Получение расчетов с пагинацией",
				"CalculationController.findAllPaginated",
				{
					requestId: ctx.requestId,
					userId: user?.id,
					page: paginationDto.page,
					limit: paginationDto.limit,
					mdc: {
						method: "GET",
						path: "/calculation/all",
						userId: user?.id,
					},
				},
			);

			const result = await this.calculationService.findAllPaginated(
				paginationDto,
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				"Расчеты с пагинацией успешно получены",
				"CalculationController.findAllPaginated",
				{
					requestId: ctx.requestId,
					total: result.meta.total,
				},
			);

			return {
				data: await Promise.all(
					result.data.map((calculation) => this.mapToResponseDto(calculation)),
				),
				meta: result.meta,
			};
		} catch (error) {
			this.customLogger.error(
				"Ошибка при получении расчетов с пагинацией",
				error.stack,
				"CalculationController.findAllPaginated",
				{
					requestId: ctx.requestId,
					error: error.message,
					pagination: paginationDto,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Get("all/list")
	@StreamFilter()
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Получить все расчеты (без пагинации)",
		description: "Возвращает все расчеты без пагинации",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Список всех расчетов",
		type: [CalculationResponseDto],
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async findAll(
		@ReqContext() ctx: RequestContext,
		@CurrentUser() user: any,
	): Promise<CalculationResponseDto[]> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				"Получение всех расчетов без пагинации",
				"CalculationController.findAll",
				{
					requestId: ctx.requestId,
					userId: user?.id,
					mdc: {
						method: "GET",
						path: "/calculation/all/list",
						userId: user?.id,
					},
				},
			);

			const calculations = await this.calculationService.findAll(
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				"Все расчеты успешно получены",
				"CalculationController.findAll",
				{
					requestId: ctx.requestId,
					count: calculations.length,
				},
			);

			return await Promise.all(
				calculations.map((calculation) => this.mapToResponseDto(calculation)),
			);
		} catch (error) {
			this.customLogger.error(
				"Ошибка при получении всех расчетов",
				error.stack,
				"CalculationController.findAll",
				{
					requestId: ctx.requestId,
					error: error.message,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Get(":id")
	@StreamFilter()
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Получить расчет по ID",
		description:
			"Возвращает конкретный расчет по его уникальному идентификатору",
	})
	@ApiParam({
		name: "id",
		description: "Уникальный идентификатор расчета",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Данные расчета",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Неверный формат UUID",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Расчет не найден",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async findOne(
		@ReqContext() ctx: RequestContext,
		@Param("id", ParseUUIDPipe) id: string,
		@CurrentUser() user: any,
	): Promise<CalculationResponseDto> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				"Получение расчета по ID",
				"CalculationController.findOne",
				{
					requestId: ctx.requestId,
					userId: user?.id,
					calculationId: id,
					mdc: {
						method: "GET",
						path: `/calculation/${id}`,
						userId: user?.id,
					},
				},
			);

			const calculation = await this.calculationService.findOne(
				id,
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				"Расчет успешно получен",
				"CalculationController.findOne",
				{
					requestId: ctx.requestId,
					calculationId: id,
				},
			);

			return await this.mapToResponseDto(calculation);
		} catch (error) {
			this.customLogger.error(
				"Ошибка при получении расчета",
				error.stack,
				"CalculationController.findOne",
				{
					requestId: ctx.requestId,
					calculationId: id,
					error: error.message,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Post("export/excel")
	@StreamFilter()
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Экспорт расчетов в Excel",
		description:
			"Экспортирует расчеты в файл Excel с применением фильтров и сортировки с использованием модели фильтров AG Grid",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Скачивание файла Excel",
		content: {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
				schema: { type: "string", format: "binary" },
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description:
			"Неверный запрос - Неверный формат JSON модели фильтров или сортировки",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	@UsePipes(new ExportValidationPipe())
	async exportToExcel(
		@ReqContext() ctx: RequestContext,
		@Body() bodyParams: TransformedExportCalculationDto,
		@CurrentUser() user: any,
		@Res() res: Response,
	): Promise<void> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				"Начало экспорта расчетов в Excel",
				"CalculationController.exportToExcel",
				{
					requestId: ctx.requestId,
					userId: user?.id,
					mdc: {
						method: "POST",
						path: "/calculation/export/excel",
						userId: user?.id,
					},
				},
			);

			const calculations = await this.calculationService.findAllForExport(
				user,
				bodyParams.parsedFilterModel,
				bodyParams.parsedSortModel,
				bodyParams.selectedIdsArray,
				ctx.abortController.signal,
			);

			const buffer =
				await this.excelExportService.generateExcelFile(calculations);

			res.setHeader(
				"Content-Type",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			);
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=Calculation-List-${new Date().toLocaleDateString("ru-RU")}.xlsx`,
			);

			this.customLogger.log(
				"Экспорт расчетов в Excel успешно завершен",
				"CalculationController.exportToExcel",
				{
					requestId: ctx.requestId,
					count: calculations.length,
				},
			);

			res.end(buffer);
		} catch (error) {
			this.customLogger.error(
				"Ошибка при экспорте расчетов в Excel",
				error.stack,
				"CalculationController.exportToExcel",
				{
					requestId: ctx.requestId,
					error: error.message,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Post(":id/new-version")
	@RealmRole(Permission.ANKETA_CREATE_CALCULATION)
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	@ApiOperation({
		summary: "Создать новую версию анкеты",
		description:
			"Создает новую версию существующей анкеты с наследованием данных",
	})
	@ApiParam({
		name: "id",
		description: "Уникальный идентификатор исходной анкеты",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Новая версия анкеты успешно создана.",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Неверный запрос. Ошибка валидации.",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Исходная анкета не найдена.",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async createNewVersion(
		@ReqContext() ctx: RequestContext,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() createNewVersionDto: CreateNewVersionDto,
		@CurrentUser() user: any,
	): Promise<CalculationResponseDto> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				`Creating new version for calculation ${id} [${ctx.requestId}]`,
				"CalculationController.createNewVersion",
				{ userId: user?.id, sourceCalcId: id },
			);

			const calculation = await this.calculationService.createNewVersion(
				id,
				createNewVersionDto,
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				`New version created [${ctx.requestId}]`,
				"CalculationController.createNewVersion",
				{ calculationId: calculation.id, sourceCalcId: id },
			);

			return await this.mapToResponseDto(calculation);
		} catch (error) {
			this.customLogger.error(
				`Failed to create new version [${ctx.requestId}]`,
				error.stack,
				"CalculationController.createNewVersion",
				{
					requestId: ctx.requestId,
					error: error.message,
					sourceCalcId: id,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	@Post(":id/clone")
	@RealmRole(Permission.ANKETA_CREATE_CALCULATION)
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	@ApiOperation({
		summary: "Клонировать анкету как шаблон",
		description: "Создает новую анкету на базе существующей как шаблона",
	})
	@ApiParam({
		name: "id",
		description: "Уникальный идентификатор анкеты-шаблона",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Анкета успешно клонирована.",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Неверный запрос. Ошибка валидации.",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Анкета-шаблон не найдена.",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Не авторизован. Требуется аутентификация.",
	})
	@ApiResponse({
		status: HttpStatus.TOO_MANY_REQUESTS,
		description: "Слишком много запросов. Превышен лимит скорости.",
		content: {
			"application/json": {
				example: {
					message: "Too many requests",
					retryAfter: "34 seconds",
				},
			},
		},
	})
	async createClone(
		@ReqContext() ctx: RequestContext,
		@Param("id", ParseUUIDPipe) id: string,
		@Body() createCloneDto: CreateCloneDto,
		@CurrentUser() user: any,
	): Promise<CalculationResponseDto> {
		this.activeRequests.set(ctx.requestId, ctx.abortController);

		try {
			this.customLogger.log(
				`Creating clone from template ${id} [${ctx.requestId}]`,
				"CalculationController.createClone",
				{ userId: user?.id, templateCalcId: id },
			);

			const calculation = await this.calculationService.createClone(
				id,
				createCloneDto,
				user,
				ctx.abortController.signal,
			);

			this.customLogger.log(
				`Clone created [${ctx.requestId}]`,
				"CalculationController.createClone",
				{ calculationId: calculation.id, templateCalcId: id },
			);

			return await this.mapToResponseDto(calculation);
		} catch (error) {
			this.customLogger.error(
				`Failed to create clone [${ctx.requestId}]`,
				error.stack,
				"CalculationController.createClone",
				{
					requestId: ctx.requestId,
					error: error.message,
					templateCalcId: id,
				},
			);
			throw error;
		} finally {
			this.activeRequests.delete(ctx.requestId);
		}
	}

	private async mapToResponseDto(
		calculation: Calculation,
	): Promise<CalculationResponseDto> {
		const generalUncertainty =
			calculation.questionnaireData &&
			calculation.questionnaireData?.generalUncertainty
				? Array.isArray(calculation.questionnaireData.generalUncertainty)
					? calculation.questionnaireData.generalUncertainty
					: Object.entries(
							calculation.questionnaireData.generalUncertainty || {},
						).map(([type, value]) => ({
							type,
							probability: value.probability,
							influence: value.influence,
						}))
				: [];

		const productionDeploymentChannels =
			(calculation.questionnaireData &&
				calculation.questionnaireData?.productionDeploymentChannels
					?.map((ch) =>
						typeof ch === "string" ? { deploymentChannel: ch } : ch,
					)
					?.map((ch) => ch.deploymentChannel)) ||
			[];

		let seriesLatestVersion: string | undefined;
		if (calculation.seriesId) {
			try {
				seriesLatestVersion =
					await this.calculationService.getMaxVersionInSeries(
						calculation.seriesId,
					);
			} catch (_error) {
				seriesLatestVersion = undefined;
			}
		}

		return {
			id: calculation.id,
			calcName: calculation.calcName,
			rfd: calculation.rfd,
			streamExecutor: calculation.streamExecutor,
			department: calculation.department,
			customerName: calculation.customerName,
			comment: calculation.comment,
			questionnaireData: {
				...(calculation.questionnaireData || {}),
                modelDeveloped: calculation.questionnaireData?.modelDeveloped || "Нет",
				generalUncertainty,
				productionDeploymentChannels,
			},
			finalCoefficient: calculation.finalCoefficient,
			createdAt: calculation.createdAt,
			author: calculation.author,
			status: calculation.status,
			version: calculation.version,
			seriesId: calculation.seriesId,
			parentCalcId: calculation.parentCalcId || undefined,
			readableId: calculation.readableId,
			parentReadableId: calculation.parentCalc?.readableId || undefined,
			seriesLatestVersion,
		};
	}
}
