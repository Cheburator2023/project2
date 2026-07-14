import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateV2QuestionnaireCommentDto {
	@ApiProperty()
	@IsString()
	@MinLength(1)
	@MaxLength(4000)
	body!: string;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	@IsString()
	parentCommentId?: string | null;
}
