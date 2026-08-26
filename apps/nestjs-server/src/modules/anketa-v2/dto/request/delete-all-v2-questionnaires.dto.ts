import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM } from "@smart-anketa/api-contract";

export class DeleteAllV2QuestionnairesDto {
	@ApiProperty({
		description: `Точная фраза «${V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM}»`,
		example: V2_QUESTIONNAIRE_DELETE_ALL_CONFIRM,
	})
	@IsString()
	confirm!: string;
}
