import { ApiPropertyOptional } from "@nestjs/swagger";
import { V2_QUESTIONNAIRE_STATUS_VALUES } from "@smart-anketa/api-contract";
import {
	IsEnum,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

export class UpdateV2QuestionnaireDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	calcName?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsObject()
	formData?: Record<string, unknown>;

	@ApiPropertyOptional()
	@IsOptional()
	@IsNumber()
	finalCoefficient?: number | null;

	@ApiPropertyOptional({ enum: V2_QUESTIONNAIRE_STATUS_VALUES })
	@IsOptional()
	@IsEnum(V2_QUESTIONNAIRE_STATUS_VALUES)
	status?: (typeof V2_QUESTIONNAIRE_STATUS_VALUES)[number];
}
