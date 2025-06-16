import { ApiProperty } from "@nestjs/swagger";
import { CalculationResponseDto } from "./calculation-response.dto";

class PaginationMetaDto {
	@ApiProperty({ example: 15 })
	total: number;

	@ApiProperty({ example: 1 })
	page: number;

	@ApiProperty({ example: 10 })
	limit: number;

	@ApiProperty({ example: 2 })
	lastPage: number;
}

export class PaginatedCalculationResponseDto {
	@ApiProperty({ type: [CalculationResponseDto] })
	data: CalculationResponseDto[];

	@ApiProperty({ type: PaginationMetaDto })
	meta: PaginationMetaDto;
}
