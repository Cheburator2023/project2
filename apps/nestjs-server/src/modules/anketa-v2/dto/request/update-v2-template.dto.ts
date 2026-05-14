import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import type { UpdateV2TemplateRequestDto } from "@smart-anketa/api-contract";

export class UpdateV2TemplateDto implements UpdateV2TemplateRequestDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

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
