import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { CreateV2TemplateRequestDto } from "@smart-anketa/api-contract";

export class CreateV2TemplateDto implements CreateV2TemplateRequestDto {
	@ApiProperty({ example: "model-stream-v1" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	code: string;

	@ApiProperty({ example: "Модельный стрим v1" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	name: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	description?: string | null;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	streamCode?: string | null;
}
