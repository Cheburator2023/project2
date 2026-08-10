import { IsString, MinLength } from "class-validator";

export class AcquireV2QuestionnaireEditLockDto {
	@IsString()
	@MinLength(1)
	lockedByLabel!: string;
}
