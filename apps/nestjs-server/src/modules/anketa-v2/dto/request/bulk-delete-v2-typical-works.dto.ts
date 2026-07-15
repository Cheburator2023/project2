import { ApiProperty } from "@nestjs/swagger";
import {
	ArrayNotEmpty,
	IsArray,
	IsBoolean,
	IsOptional,
	IsUUID,
} from "class-validator";

export class BulkDeleteV2TypicalWorksDto {
	@ApiProperty({ type: [String], format: "uuid" })
	@IsArray()
	@ArrayNotEmpty()
	@IsUUID("4", { each: true })
	ids: string[];

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	confirm?: boolean;
}
