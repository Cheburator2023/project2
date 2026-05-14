import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import type { CreateV2DictionaryRequestDto } from "@smart-anketa/api-contract";

export class CreateV2DictionaryDto implements CreateV2DictionaryRequestDto {
	@ApiProperty({ example: "model-class" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	code: string;

	@ApiProperty({ example: "Класс модели" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	name: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	description?: string | null;
}

export class UpdateV2DictionaryDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(255)
	name?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	description?: string | null;
}

export class CreateV2DictionaryItemDto {
	@ApiProperty({ example: "retail" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	code: string;

	@ApiProperty({ example: "Розничные бизнес-модели" })
	@IsNotEmpty()
	@IsString()
	@MaxLength(500)
	label: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	parentCode?: string | null;

	@ApiProperty({ required: false, example: 0 })
	@IsOptional()
	order?: number;

	@ApiProperty({ required: false, example: true })
	@IsOptional()
	isActive?: boolean;

	@ApiProperty({ required: false })
	@IsOptional()
	payload?: Record<string, unknown> | null;
}

export class UpdateV2DictionaryItemDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	label?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	parentCode?: string | null;

	@ApiProperty({ required: false })
	@IsOptional()
	order?: number;

	@ApiProperty({ required: false })
	@IsOptional()
	isActive?: boolean;

	@ApiProperty({ required: false })
	@IsOptional()
	payload?: Record<string, unknown> | null;
}
