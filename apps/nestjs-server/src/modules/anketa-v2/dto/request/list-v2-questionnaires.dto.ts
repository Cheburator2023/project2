import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from "class-validator";
import {
	V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
	type V2QuestionnaireRegistryVersionMode,
} from "@smart-anketa/api-contract";

export class ListV2QuestionnairesDto {
	@ApiPropertyOptional({
		description: "Номер страницы (с 1)",
		default: 1,
		minimum: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page = 1;

	@ApiPropertyOptional({
		description: "Размер страницы",
		default: V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
		minimum: 1,
		maximum: 100,
	})
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit = V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE;

	@ApiPropertyOptional({
		description: "Поиск по названию, readableId, автору, id",
		maxLength: 200,
	})
	@IsOptional()
	@IsString()
	@MaxLength(200)
	search?: string;

	@ApiPropertyOptional({
		description:
			"Режим версий ДАДМ: actual | approved (пагинация после выбора версии на серию)",
		enum: ["actual", "approved"],
	})
	@IsOptional()
	@IsIn(["actual", "approved"])
	versionMode?: V2QuestionnaireRegistryVersionMode;
}
