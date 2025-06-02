import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateCalculationDto } from "../dto/create-calculation.dto";
import { Calculation } from "../entities/calculation.entity";
import { CalculationService } from "../services/calculation.service";

@ApiTags("Calculations")
@ApiBearerAuth()
@Controller("calculations")
export class CalculationController {
	constructor(private readonly calculationService: CalculationService) {}

	@Post()
	@UseGuards(JwtAuthGuard)
	@ApiOperation({ summary: "Create new calculation" })
	@ApiResponse({
		status: 201,
		description: "The calculation has been successfully created.",
		type: Calculation,
	})
	@ApiResponse({ status: 401, description: "Unauthorized." })
	async create(
		@Body() createCalculationDto: CreateCalculationDto,
	): Promise<Calculation> {
		return this.calculationService.create(createCalculationDto);
	}

	@Get()
	@UseGuards(JwtAuthGuard)
	@ApiOperation({ summary: "Get all calculations" })
	@ApiResponse({
		status: 200,
		description: "List of all calculations",
		type: [Calculation],
	})
	async findAll(): Promise<Calculation[]> {
		return this.calculationService.findAll();
	}
}
