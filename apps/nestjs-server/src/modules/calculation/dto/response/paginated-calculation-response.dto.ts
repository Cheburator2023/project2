import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { CalculationResponseDto } from "./calculation-response.dto";

export class PaginationMetaDto {
	@ApiProperty({
		example: 100,
		description: "Общее количество записей",
	})
	total: number;

	@ApiProperty({
		example: 1,
		description: "Номер текущей страницы",
	})
	page: number;

	@ApiProperty({
		example: 10,
		description: "Количество записей на странице",
	})
	limit: number;

	@ApiProperty({
		example: 10,
		description: "Номер последней страницы",
	})
	lastPage: number;
}

export class PaginatedCalculationResponseDto {
	@ApiProperty({
		type: [CalculationResponseDto],
		description: "Список расчетов",
	})
	@Type(() => CalculationResponseDto)
	data: CalculationResponseDto[];

	@ApiProperty({
		type: PaginationMetaDto,
		description: "Метаданные пагинации",
	})
	@Type(() => PaginationMetaDto)
	meta: PaginationMetaDto;
}
