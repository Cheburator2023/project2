import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Resource } from "nest-keycloak-connect";
import { QuestionnaireService } from "../services/questionnaire.service";
import { QuestionnaireResponseDto } from "../dto/response/questionnaire-response.dto";

@ApiBearerAuth("JWT-auth")
@ApiTags("Questionnaire")
@Controller("questionnaire")
@Resource("questionnaire")
export class QuestionnaireController {
    constructor(private readonly service: QuestionnaireService) {}

    @Get()
    @ApiOperation({
        summary: "Get full questionnaire configuration",
        description: "Retrieves complete questionnaire structure with dictionaries and coefficients",
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