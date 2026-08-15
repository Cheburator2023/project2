import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsUUID } from "class-validator";

export class ExportV2QuestionnairesXlsxDto {
	@ApiPropertyOptional({ type: [String], format: "uuid" })
	@IsOptional()
	@IsArray()
	@IsUUID("4", { each: true })
	ids?: string[];
}
