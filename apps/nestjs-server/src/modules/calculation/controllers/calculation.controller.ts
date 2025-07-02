import {
	Body,
	Controller,
	Get,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
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
import {
	CalculationResponseDto,
	CreateCalculationDto,
	PaginatedCalculationResponseDto,
	PaginationDto,
} from "../dto";
import { CalculationService } from "../services/calculation.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("Calculation")
@Controller("calculation")
export class CalculationController {
	constructor(private readonly calculationService: CalculationService) {}

	@Post()
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
	): Promise<CalculationResponseDto> {
		const calculation =
			await this.calculationService.create(createCalculationDto);
		return this.mapToResponseDto(calculation);
	}

	@Get("all")
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

	private mapToResponseDto(calculation: any): CalculationResponseDto {
		return {
			id: calculation.id,
			name: calculation.name,
			questionnaireData: calculation.questionnaireData,
			finalCoefficient: calculation.finalCoefficient,
			createdAt: calculation.createdAt,
		};
	}
}
