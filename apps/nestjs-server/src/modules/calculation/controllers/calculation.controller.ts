import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UsePipes,
	ValidationPipe,
} from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { Resource } from "nest-keycloak-connect";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { PaginationDto } from "../dto/pagination.dto";
import { Calculation } from "../entities/calculation.entity";
import { PaginatedResult } from "../interfaces/paginated-result.interface";
import { CalculationService } from "../services/calculation.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("Calculation")
@Controller("calculation")
@Resource("calculation")
export class CalculationController {
	constructor(private readonly calculationService: CalculationService) {}

	@Post()
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	@ApiOperation({ summary: "Save calculation result" })
	@ApiResponse({
		status: 201,
		description: "The calculation has been successfully saved.",
		type: Calculation,
	})
	@ApiResponse({
		status: 400,
		description: "Bad request. Validation failed.",
	})
	async create(@Body() createCalculationDto: CreateCalculationDto) {
		return this.calculationService.create(createCalculationDto);
	}

	@Get("all")
	@ApiOperation({ summary: "Get all calculations (paginated)" })
	@ApiQuery({ name: "page", required: false, type: Number })
	@ApiQuery({ name: "limit", required: false, type: Number })
	@ApiResponse({
		status: 200,
		description: "Paginated list of calculations",
		schema: {
			properties: {
				data: {
					type: "array",
					items: { $ref: "#/components/schemas/Calculation" },
				},
				meta: {
					properties: {
						total: { type: "number" },
						page: { type: "number" },
						limit: { type: "number" },
						lastPage: { type: "number" },
					},
				},
			},
		},
	})
	async findAllPaginated(
		@Query() paginationDto: PaginationDto,
	): Promise<PaginatedResult<Calculation>> {
		return this.calculationService.findAllPaginated(paginationDto);
	}

	@Get("all/list")
	@ApiOperation({ summary: "Get all calculations (non-paginated)" })
	@ApiResponse({
		status: 200,
		description: "List of all calculations",
		type: [Calculation],
	})
	async findAll(): Promise<Calculation[]> {
		return this.calculationService.findAll();
	}

	@Get(":id")
	@ApiOperation({ summary: "Get calculation by ID" })
	@ApiResponse({
		status: 200,
		description: "Calculation data",
		type: Calculation,
	})
	@ApiResponse({
		status: 400,
		description: "Invalid UUID format",
	})
	@ApiResponse({
		status: 404,
		description: "Calculation not found",
	})
	async findOne(@Param("id") id: string) {
		return this.calculationService.findOne(id);
	}
}
