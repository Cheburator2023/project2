import {
	Body,
	Controller,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { V2CalculationResultDto } from "@smart-anketa/api-contract";
import { patchV2TypicalWorksLogicRules } from "@smart-anketa/api-contract";
import { CalculateV2TemplateDto } from "../dto";
import { V2CalculationService } from "../services/v2-calculation.service";

@ApiTags("v2-calculations")
@Controller("v2/templates/:templateId/calculate")
export class V2CalculationController {
	constructor(private readonly calculationService: V2CalculationService) {}

	@Post()
	@ApiOperation({
		summary:
			"Рассчитать computed/row_computed/task_trigger правила и вернуть обогащённые данные формы.",
	})
	async calculate(
		@Param("templateId", ParseUUIDPipe) templateId: string,
		@Body() body: CalculateV2TemplateDto,
		@Query("versionId") versionId?: string,
	): Promise<V2CalculationResultDto> {
		const version = await this.calculationService.getEffectiveVersion(
			templateId,
			versionId,
		);
		const logic = patchV2TypicalWorksLogicRules(
			body.rulesOverride ?? version.logic,
			{
				jsonSchema: body.jsonSchema ?? version.jsonSchema,
				uiSchema: body.uiSchema ?? version.uiSchema,
			},
		);
		return this.calculationService.evaluate(logic, body.formData ?? {}, {
			templateVersionId: version.id,
			templateId: version.templateId,
			jsonSchema: body.jsonSchema ?? version.jsonSchema,
			uiSchema: body.uiSchema ?? version.uiSchema,
		});
	}
}
