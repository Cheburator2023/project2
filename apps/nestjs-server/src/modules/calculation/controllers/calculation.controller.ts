import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post, Put,
    Query,
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
} from "../dto";
import { CalculationService } from "../services/calculation.service";
import {UpdateCalculationDto} from "../dto/request/update-calculation.dto";
import {Calculation} from "../entities/calculation.entity";

@ApiBearerAuth("JWT-auth")
@ApiTags("Calculation")
@Controller("calculation")
@UseInterceptors(StreamFilterInterceptor)
export class CalculationController {
    constructor(private readonly calculationService: CalculationService) {}

    @Post()
    @RealmRole(Permission.ANKETA_CREATE_CALCULATION)
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
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
    async create(
        @Body() createCalculationDto: CreateCalculationDto,
        @CurrentUser() user: any,
    ): Promise<CalculationResponseDto> {
        const calculation = await this.calculationService.create(
            createCalculationDto,
            user,
        );
        return this.mapToResponseDto(calculation);
    }

    @Put(":id")
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
    async update(
        @Param("id", ParseUUIDPipe) id: string,
        @Body() updateCalculationDto: UpdateCalculationDto,
    ): Promise<CalculationResponseDto> {
        const calculation = await this.calculationService.updateCalculation(
            id,
            updateCalculationDto,
        );
        return this.mapToResponseDto(calculation);
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
    async findAllPaginated(
        @Query() paginationDto: PaginationDto,
    ): Promise<PaginatedCalculationResponseDto> {
        const result =
            await this.calculationService.findAllPaginated(paginationDto);
        return {
            data: result.data.map((calculation) =>
                this.mapToResponseDto(calculation),
            ),
            meta: result.meta,
        };
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
    async findAll(): Promise<CalculationResponseDto[]> {
        const calculations = await this.calculationService.findAll();
        return calculations.map((calculation) =>
            this.mapToResponseDto(calculation),
        );
    }

    	@Get(":id")
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
	async findOne(
		@Param("id", ParseUUIDPipe) id: string,
	): Promise<CalculationResponseDto> {
        const calculation = await this.calculationService.findOne(id);
        return this.mapToResponseDto(calculation);
    }

    private mapToResponseDto(calculation: Calculation): CalculationResponseDto {
        const generalUncertainty = Array.isArray(calculation.questionnaireData.generalUncertainty)
            ? calculation.questionnaireData.generalUncertainty
            : Object.entries(calculation.questionnaireData.generalUncertainty || {})
                .map(([type, value]) => ({
                    type,
                    probability: value.probability,
                    influence: value.influence
                }));

        const productionDeploymentChannels = calculation.questionnaireData.productionDeploymentChannels
            ?.map(ch => typeof ch === 'string' ? { deploymentChannel: ch } : ch)
            ?.map(ch => ch.deploymentChannel) || [];

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
            author: calculation.author
        };
    }
}
