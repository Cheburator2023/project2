import { ApiProperty } from "@nestjs/swagger";
import {
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
} from "class-validator";
import type {
	CreateV2TemplateVersionRequestDto,
	V2DictionariesSnapshotDto,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";

export class CreateV2TemplateVersionDto
	implements CreateV2TemplateVersionRequestDto
{
	@ApiProperty({ example: {} })
	@IsNotEmpty()
	@IsObject()
	jsonSchema: V2JsonSchemaDto;

	@ApiProperty({ required: false, example: {} })
	@IsOptional()
	@IsObject()
	uiSchema?: V2UiSchemaDto;

	@ApiProperty({ required: false, example: { rules: [] } })
	@IsOptional()
	@IsObject()
	logic?: V2LogicGraphDto;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsObject()
	dictionariesSnapshot?: V2DictionariesSnapshotDto | null;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	releaseNotes?: string | null;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsUUID()
	parentVersionId?: string | null;
}

export class PublishV2TemplateVersionDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	releaseNotes?: string | null;
}

export class RollbackV2TemplateVersionDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsUUID()
	targetVersionId: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	releaseNotes?: string | null;
}
