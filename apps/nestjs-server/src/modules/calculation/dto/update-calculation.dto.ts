import { IsObject, IsOptional, IsString } from "class-validator";

export class UpdateCalculationDto {
	@IsString()
	@IsOptional()
	name?: string;

	@IsObject()
	@IsOptional()
	questionnaireData?: Record<string, any>;
}
