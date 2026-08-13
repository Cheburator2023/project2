import { ApiPropertyOptional } from "@nestjs/swagger";
import {
	IsBoolean,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

export class CreateV2QuestionnaireVersionDto {
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

	@ApiPropertyOptional({
		description:
			"true — привязать к актуальной версии схемы; иначе сохранить схему исходной версии",
	})
	@IsOptional()
	@IsBoolean()
	useCurrentSchema?: boolean;
}
