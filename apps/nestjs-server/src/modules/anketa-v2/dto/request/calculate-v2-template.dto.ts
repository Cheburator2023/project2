import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";
import type {
	V2CalculateRequestDto,
	V2LogicGraphDto,
} from "@smart-anketa/api-contract";

export class CalculateV2TemplateDto implements V2CalculateRequestDto {
	@ApiProperty({ additionalProperties: true })
	@IsObject()
	formData: Record<string, unknown>;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsObject()
	rulesOverride?: V2LogicGraphDto;

	@ApiProperty({ required: false, additionalProperties: true })
	@IsOptional()
	@IsObject()
	jsonSchema?: Record<string, unknown>;

	@ApiProperty({ required: false, additionalProperties: true })
	@IsOptional()
	@IsObject()
	uiSchema?: Record<string, unknown>;
}
