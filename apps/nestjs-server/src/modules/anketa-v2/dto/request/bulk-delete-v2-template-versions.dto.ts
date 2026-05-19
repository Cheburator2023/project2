import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsUUID } from "class-validator";

export class BulkDeleteV2TemplateVersionsDto {
	@ApiProperty({ type: [String], required: false })
	@IsOptional()
	@IsArray()
	@IsUUID("4", { each: true })
	versionIds?: string[];
}
