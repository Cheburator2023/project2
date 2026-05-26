import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateV2QuestionnaireDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	calcName?: string;

	@ApiPropertyOptional({ description: "Шаблон схемы; если не указан — единственный с currentVersionId" })
	@IsOptional()
	@IsUUID()
	templateId?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsObject()
	formData?: Record<string, unknown>;

	@ApiPropertyOptional()
	@IsOptional()
	@IsNumber()
	finalCoefficient?: number | null;
}
