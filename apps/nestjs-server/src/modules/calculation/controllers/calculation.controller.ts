import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "../services/calculation.service";

@ApiTags("Calculation")
@Controller("calculation")
export class CalculationController {
	constructor(private readonly calculationService: CalculationService) {}

	@Post()
	@ApiOperation({ summary: "Save calculation result" })
	@ApiResponse({
		status: 201,
		description: "The calculation has been successfully saved.",
		type: Calculation,
	})
	async create(@Body() createCalculationDto: CreateCalculationDto) {
		return this.calculationService.create(createCalculationDto);
	}

	@Get(":id")
	@ApiOperation({ summary: "Get calculation by ID" })
	@ApiOperation({ summary: "Get specific calculation" }) // Уточненное описание
	@ApiResponse({
		status: 200,
		description: "Calculation data",
		type: Calculation,
	})
	async findOne(@Param("id") id: string) {
		return this.calculationService.findOne(id);
	}

	@Get("all")
	@ApiOperation({ summary: "Get all calculations" })
	@ApiResponse({
		status: 200,
		description: "List of all calculations",
		type: [Calculation],
	})
	async findAll() {
		return this.calculationService.findAll();
	}
}
