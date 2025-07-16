import { Controller, Get, Param, Query } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { Resource } from "nest-keycloak-connect";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";
import { CoefficientEntity } from "../entities/coefficient.entity";
import { CoefficientService } from "../services/coefficient.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("Questionnaire")
@Controller("questionnaire/coefficients")
@Resource("questionnaire")
export class CoefficientController {
	constructor(private readonly service: CoefficientService) {}

	@Get()
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Get all coefficients",
		description: "Retrieves all active coefficients with their base values",
	})
	@ApiResponse({
		status: 200,
		description: "List of coefficients",
		type: [CoefficientEntity],
	})
	async findAll(): Promise<CoefficientEntity[]> {
		return this.service.findAll();
	}

	@Get(":code")
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Get coefficient value",
		description: "Calculates coefficient value based on input",
	})
	@ApiResponse({
		status: 200,
		description: "Calculated coefficient value",
		type: Number,
	})
	async getValue(
		@Param("code") code: string,
		@Query("value") inputValue?: string,
	): Promise<number> {
		return this.service.getCoefficientValue(code, inputValue);
	}
}
