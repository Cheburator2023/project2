import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class PaginationDto {
	@ApiProperty({
		required: false,
		description: "Page number (starting from 1)",
		example: 1,
		default: 1,
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	page = 1;

	@ApiProperty({
		required: false,
		description: "Number of items per page",
		example: 10,
		default: 10,
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	@Max(100)
	limit = 10;
}
