import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class SeedV2TestQuestionnairesDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID("4")
	templateId?: string;
}
