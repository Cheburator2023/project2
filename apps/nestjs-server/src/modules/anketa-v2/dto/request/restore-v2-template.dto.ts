import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsArray,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	ValidateNested,
} from "class-validator";
import type {
	V2DictionariesSnapshotDto,
	V2JsonSchemaDto,
	V2LogicGraphDto,
	V2TemplateDeleteSnapshotDto,
	V2TemplateStatus,
	V2UiSchemaDto,
} from "@smart-anketa/api-contract";

export class RestoreV2TemplateItemDto {
	@ApiProperty({ format: "uuid" })
	@IsUUID("4")
	id: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@MaxLength(100)
	code: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	name: string;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	description: string | null;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	streamCode: string | null;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsUUID("4")
	currentVersionId: string | null;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	createdAt: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	updatedAt: string;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	createdBy: string | null;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	updatedBy: string | null;
}

export class RestoreV2TemplateVersionItemDto {
	@ApiProperty({ format: "uuid" })
	@IsUUID("4")
	id: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID("4")
	templateId: string;

	@ApiProperty()
	@IsInt()
	versionNumber: number;

	@ApiProperty({ enum: ["draft", "published", "archived"] })
	@IsEnum(["draft", "published", "archived"])
	status: V2TemplateStatus;

	@ApiProperty()
	@IsObject()
	jsonSchema: V2JsonSchemaDto;

	@ApiProperty()
	@IsObject()
	uiSchema: V2UiSchemaDto;

	@ApiProperty()
	@IsObject()
	logic: V2LogicGraphDto;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsObject()
	dictionariesSnapshot: V2DictionariesSnapshotDto | null;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	releaseNotes: string | null;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsUUID("4")
	parentVersionId: string | null;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	createdAt: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	updatedAt: string;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	publishedAt: string | null;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsString()
	createdBy: string | null;
}

export class RestoreV2TemplateDto implements V2TemplateDeleteSnapshotDto {
	@ApiProperty({ type: RestoreV2TemplateItemDto })
	@ValidateNested()
	@Type(() => RestoreV2TemplateItemDto)
	template: RestoreV2TemplateItemDto;

	@ApiProperty({ type: [RestoreV2TemplateVersionItemDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => RestoreV2TemplateVersionItemDto)
	versions: RestoreV2TemplateVersionItemDto[];
}

export class RestoreV2TemplateVersionsDto {
	@ApiProperty({ type: [RestoreV2TemplateVersionItemDto] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => RestoreV2TemplateVersionItemDto)
	versions: RestoreV2TemplateVersionItemDto[];
}
