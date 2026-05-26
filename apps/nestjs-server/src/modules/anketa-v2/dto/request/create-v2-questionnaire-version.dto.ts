import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsObject, IsOptional, IsString } from "class-validator";

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
}
