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
import { ReqContext, RequestContext } from "../../../shared/decorators/request-context.decorator";

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
                    retryAfter: "34 seconds"
                }
            }
        }
    })
    async create(
        @ReqContext() ctx: RequestContext,
        @Body() createCalculationDto: CreateCalculationDto,
        @CurrentUser() user: any,
    ): Promise<CalculationResponseDto> {
        this.activeRequests.set(ctx.requestId, ctx.abortController);

        try {
            this.customLogger.log(
                `Creating calculation [${ctx.requestId}]`,
                "CalculationController.create",
                { userId: user?.id },
            );

            const calculation = await this.calculationService.create(
                createCalculationDto,
                user,
                ctx.abortController.signal,
            );

            this.customLogger.log(
                `Calculation created [${ctx.requestId}]`,
                "CalculationController.create",
                { calculationId: calculation.id },
            );

            return this.mapToResponseDto(calculation);
        } catch (error) {
            this.customLogger.error(
                `Failed to create calculation [${ctx.requestId}]`,
                error.stack,
                "CalculationController.create",
                {
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
                    retryAfter: "34 seconds"
                }
            }
        }
    })
    async update(
        @ReqContext() ctx: RequestContext,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateCalculationDto: UpdateCalculationDto,
    ): Promise<CalculationResponseDto> {
        this.activeRequests.set(ctx.requestId, ctx.abortController);

        try {
            const calculation = await this.calculationService.updateCalculation(
                id,
                updateCalculationDto,
                ctx.abortController.signal,
            );
            return this.mapToResponseDto(calculation);
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
                    retryAfter: "34 seconds"
                }
            }
        }
    })
    async findAllPaginated(
        @ReqContext() ctx: RequestContext,
        @Query() paginationDto: PaginationDto,
    ): Promise<PaginatedCalculationResponseDto> {
        this.activeRequests.set(ctx.requestId, ctx.abortController);

        try {
            const result = await this.calculationService.findAllPaginated(
                paginationDto,
                ctx.abortController.signal,
            );
            return {
                data: result.data.map((calculation) =>
                    this.mapToResponseDto(calculation),
                ),
                meta: result.meta,
            };
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
                    retryAfter: "34 seconds"
                }
            }
        }
    })
    async findAll(
        @ReqContext() ctx: RequestContext,
    ): Promise<CalculationResponseDto[]> {
        this.activeRequests.set(ctx.requestId, ctx.abortController);

        try {
            const calculations = await this.calculationService.findAll(
                ctx.abortController.signal,
            );
            return calculations.map((calculation) =>
                this.mapToResponseDto(calculation),
            );
        } finally {
            this.activeRequests.delete(ctx.requestId);
        }
	}

	@Get(":id")
    @StreamFilter()
    @RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
    @ApiOperation({
        summary: "Получить расчет по ID",
        description: "Возвращает конкретный расчет по его уникальному идентификатору",
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
                    retryAfter: "34 seconds"
                }
            }
        }
    })
    async findOne(
        @ReqContext() ctx: RequestContext,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<CalculationResponseDto> {
        this.activeRequests.set(ctx.requestId, ctx.abortController);

        try {
            const calculation = await this.calculationService.findOne(
                id,
                ctx.abortController.signal,
            );
            return this.mapToResponseDto(calculation);
        } finally {
            this.activeRequests.delete(ctx.requestId);
        }
	}

	@Get("export/excel")
    @StreamFilter()
    @RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
    @ApiOperation({
        summary: "Экспорт расчетов в Excel",
        description:
            "Экспортирует расчеты в файл Excel с применением фильтров и сортировки с использованием модели фильтров AG Grid",
    })
    @ApiQuery({
        name: "filterModel",
        required: false,
        description: "Модель фильтров AG Grid в виде JSON строки. Поддерживает текстовые, числовые, даты и множественные фильтры с различными операторами (contains, equals, startsWith, endsWith, notEqual, greaterThan, lessThan, inRange)",
        example: '{"calcName":{"filterType":"text","type":"contains","filter":"тест"},"finalCoefficient":{"filterType":"number","type":"greaterThan","filter":1.5}}',
        schema: { type: "string" },
    })
    @ApiQuery({
        name: "sortModel",
        required: false,
        description: "Модель сортировки AG Grid в виде JSON строки. Массив конфигураций сортировки с ID колонки и направлением сортировки",
        example: '[{"colId":"calcName","sort":"asc"},{"colId":"createdAt","sort":"desc"}]',
        schema: { type: "string" },
    })
    @ApiQuery({
        name: "selectedIds",
        required: false,
        description: "Список ID расчетов для экспорта через запятую. Если указан, будут экспортированы только эти расчеты независимо от фильтров",
        example: "550e8400-e29b-41d4-a716-446655440000,660e8400-e29b-41d4-a716-446655440001",
        schema: { type: "string" },
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
        description: "Неверный запрос - Неверный формат JSON модели фильтров или сортировки",
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
                    retryAfter: "34 seconds"
                }
            }
        }
    })
    @UsePipes(new ExportValidationPipe())
    async exportToExcel(
        @ReqContext() ctx: RequestContext,
        @Query() queryParams: TransformedExportCalculationDto,
        @Res() res: Response,
    ): Promise<void> {
        this.activeRequests.set(ctx.requestId, ctx.abortController);

        try {
            const calculations = await this.calculationService.findAllForExport(
                queryParams.parsedFilterModel,
                queryParams.parsedSortModel,
                queryParams.selectedIdsArray,
                ctx.abortController.signal,
            );

            const buffer = await this.excelExportService.generateExcelFile(
                calculations,
            );

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=Calculation-List-${new Date().toLocaleDateString("ru-RU")}.xlsx`,
            );

            res.end(buffer);
        } finally {
            this.activeRequests.delete(ctx.requestId);
        }
    }

	private mapToResponseDto(calculation: Calculation): CalculationResponseDto {
		const generalUncertainty = Array.isArray(
			calculation.questionnaireData.generalUncertainty,
		)
			? calculation.questionnaireData.generalUncertainty
			: Object.entries(
					calculation.questionnaireData.generalUncertainty || {},
				).map(([type, value]) => ({
					type,
					probability: value.probability,
					influence: value.influence,
				}));

		const productionDeploymentChannels =
			calculation.questionnaireData.productionDeploymentChannels
				?.map((ch) => (typeof ch === "string" ? { deploymentChannel: ch } : ch))
				?.map((ch) => ch.deploymentChannel) || [];

		return {
			id: calculation.id,
			calcName: calculation.calcName,
			rfd: calculation.rfd,
			streamExecutor: calculation.streamExecutor,
			department: calculation.department,
			customerName: calculation.customerName,
			comment: calculation.comment,
			questionnaireData: {
				...calculation.questionnaireData,
				generalUncertainty,
				productionDeploymentChannels,
			},
			finalCoefficient: calculation.finalCoefficient,
			createdAt: calculation.createdAt,
			author: calculation.author,
		};
	}
}
