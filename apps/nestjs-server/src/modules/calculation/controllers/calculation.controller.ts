import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { Resource } from "nest-keycloak-connect";

import { PaginatedCalculationResponseDto } from "../dto/calculation-response-paginated.dto";
import { CalculationResponseDto } from "../dto/calculation-response.dto";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { PaginationDto } from "../dto/pagination.dto";
import { CalculationService } from "../services/calculation.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("Calculation")
@Controller("calculation")
@Resource("calculation")
export class CalculationController {
	constructor(private readonly calculationService: CalculationService) {}

	@Post()
	@ApiOperation({ summary: "Save calculation result" })
	@ApiResponse({
		status: 201,
		description: "The calculation has been successfully saved.",
		type: CalculationResponseDto,
	})
	async create(
		@Body() createCalculationDto: CreateCalculationDto,
	): Promise<CalculationResponseDto> {
		const calculation =
			await this.calculationService.create(createCalculationDto);
		return plainToInstance(CalculationResponseDto, calculation);
	}

	@Get("all")
	@ApiOperation({ summary: "Get all calculations (paginated)" })
	@ApiQuery({ name: "page", required: false, type: Number })
	@ApiQuery({ name: "limit", required: false, type: Number })
	@ApiResponse({
		status: 200,
		description: "Paginated list of calculations",
		type: PaginatedCalculationResponseDto,
	})
	async findAllPaginated(
		@Query() paginationDto: PaginationDto,
	): Promise<PaginatedCalculationResponseDto> {
		const result =
			await this.calculationService.findAllPaginated(paginationDto);
		return {
			...result,
			data: plainToInstance(CalculationResponseDto, result.data),
		};
	}

	@Get("all/list")
	@ApiOperation({ summary: "Get all calculations (non-paginated)" })
	@ApiResponse({
		status: 200,
		description: "List of all calculations",
		type: [CalculationResponseDto],
	})
	async findAll(): Promise<CalculationResponseDto[]> {
		const calculations = await this.calculationService.findAll();
		return plainToInstance(CalculationResponseDto, calculations);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get calculation by ID" })
	@ApiResponse({
		status: 200,
		description: "Calculation data",
		type: CalculationResponseDto,
	})
	@ApiResponse({
		status: 400,
		description: "Invalid UUID format",
	})
	@ApiResponse({
		status: 404,
		description: "Calculation not found",
	})
	async findOne(@Param("id") id: string): Promise<CalculationResponseDto> {
		const calculation = await this.calculationService.findOne(id);
		return plainToInstance(CalculationResponseDto, calculation);
	}
}
