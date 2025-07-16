import { Controller, Get } from "@nestjs/common";
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from "@nestjs/swagger";
import { Resource } from "nest-keycloak-connect";
import { RealmRole } from "../../../shared/decorators/realm-role.decorator";
import { Permission } from "../../../shared/types/permissions";
import { QuestionnaireResponseDto } from "../dto/response/questionnaire-response.dto";
import { QuestionnaireService } from "../services/questionnaire.service";

@ApiBearerAuth("JWT-auth")
@ApiTags("Questionnaire")
@Controller("questionnaire")
@Resource("questionnaire")
export class QuestionnaireController {
	constructor(private readonly service: QuestionnaireService) {}

	@Get()
	@RealmRole(Permission.ANKETA_VIEW_ALL_CALCULATIONS)
	@ApiOperation({
		summary: "Get full questionnaire configuration",
		description:
			"Retrieves complete questionnaire structure with dictionaries and coefficients",
	})
	@ApiResponse({
		status: 200,
		description: "Questionnaire configuration",
		type: QuestionnaireResponseDto,
	})
	async getFullQuestionnaire(): Promise<QuestionnaireResponseDto> {
		return this.service.getFullQuestionnaire();
	}
}
