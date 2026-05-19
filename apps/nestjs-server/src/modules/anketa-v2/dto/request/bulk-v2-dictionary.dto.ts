import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";
import type { BulkV2DictionaryIdsRequestDto } from "@smart-anketa/api-contract";

export class BulkV2DictionaryIdsDto implements BulkV2DictionaryIdsRequestDto {
	@ApiProperty({ type: [String], format: "uuid" })
	@IsArray()
	@ArrayNotEmpty()
	@IsUUID("4", { each: true })
	ids: string[];
}
