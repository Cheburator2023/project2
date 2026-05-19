import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";
import type {
	V2CalculateRequestDto,
	V2LogicGraphDto,
} from "@smart-anketa/api-contract";

export class CalculateV2TemplateDto implements V2CalculateRequestDto {
	@ApiProperty({ type: "object", additionalProperties: true })
	@IsObject()
	formData: Record<string, unknown>;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsObject()
	rulesOverride?: V2LogicGraphDto;
}
