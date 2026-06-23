import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsString } from "class-validator";
import type { BulkV2DictionaryCodesRequestDto } from "@smart-anketa/api-contract";

export class BulkV2DictionaryJsonDto implements BulkV2DictionaryCodesRequestDto {
	@ApiProperty({ type: [String], description: "Коды справочников" })
	@IsArray()
	@ArrayNotEmpty()
	@IsString({ each: true })
	codes: string[];
}
