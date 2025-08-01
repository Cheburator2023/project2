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
		summary: "Create new calculation",
		description: "Creates a new calculation with the provided data",
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "The calculation has been successfully created.",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Bad request. Validation failed.",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Unauthorized. Authentication required.",
	})
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: "Too many requests. Rate limit exceeded.",
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
		summary: "Update calculation basic information",
		description: "Updates basic information of an existing calculation",
	})
	@ApiParam({
		name: "id",
		description: "Calculation unique identifier",
		example: "550e8400-e29b-41d4-a716-446655440000",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "The calculation has been successfully updated.",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Bad request. Validation failed.",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Calculation not found.",
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Unauthorized. Authentication required.",
	})
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: "Too many requests. Rate limit exceeded.",
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
		summary: "Get all calculations (paginated)",
		description: "Retrieves a paginated list of all calculations",
	})
	@ApiQuery({
		name: "page",
		required: false,
		type: Number,
		description: "Page number (starting from 1)",
		example: 1,
	})
	@ApiQuery({
		name: "limit",
		required: false,
		type: Number,
		description: "Number of items per page (max 100)",
		example: 10,
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Paginated list of calculations",
		type: PaginatedCalculationResponseDto,
	})
	@ApiResponse({
		status: HttpStatus.UNAUTHORIZED,
		description: "Unauthorized. Authentication required.",
	})
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: "Too many requests. Rate limit exceeded.",
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
        summary: "Get all calculations (non-paginated)",
        description: "Retrieves all calculations without pagination",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "List of all calculations",
        type: [CalculationResponseDto],
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: "Unauthorized. Authentication required.",
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: "Too many requests. Rate limit exceeded.",
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
        summary: "Get calculation by ID",
        description: "Retrieves a specific calculation by its unique identifier",
    })
    @ApiParam({
        name: "id",
        description: "Calculation unique identifier",
        example: "550e8400-e29b-41d4-a716-446655440000",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Calculation data",
        type: CalculationResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: "Invalid UUID format",
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: "Calculation not found",
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: "Unauthorized. Authentication required.",
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: "Too many requests. Rate limit exceeded.",
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
        summary: "Export calculations to Excel",
        description:
            "Exports calculations to Excel file with applied filters and sorting",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Excel file download",
        content: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
                schema: { type: "string", format: "binary" },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: "Bad request",
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: "Unauthorized. Authentication required.",
    })
    @ApiResponse({
        status: HttpStatus.TOO_MANY_REQUESTS,
        description: "Too many requests. Rate limit exceeded.",
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
            const filters = {
                name: queryParams.name,
                finalCoefficient:
                    queryParams.minFinalCoefficient || queryParams.maxFinalCoefficient
                        ? {
                                min: queryParams.minFinalCoefficient,
                                max: queryParams.maxFinalCoefficient,
                            }
                        : undefined,
                createdAt:
                    queryParams.createdFrom || queryParams.createdTo
                        ? {
                                from: queryParams.createdFrom
                                    ? new Date(queryParams.createdFrom)
                                    : undefined,
                                to: queryParams.createdTo
                                    ? new Date(queryParams.createdTo)
                                    : undefined,
                            }
                        : undefined,
                status: queryParams.status,
            };

            const sort =
                queryParams.field || queryParams.order
                    ? {
                            field: queryParams.field || "createdAt",
                            order: queryParams.order || "DESC",
                        }
                    : undefined;

            const calculations = await this.calculationService.findAllForExport(
                filters,
                sort,
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
