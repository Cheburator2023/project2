import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export type SortField = "name" | "createdAt" | "finalCoefficient";
export type SortOrder = "ASC" | "DESC";

export class ExportCalculationDto {
	@ApiPropertyOptional({
		example: "Оценка риска",
		description: "Фильтр по названию расчета",
	})
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional({
		example: 1.0,
		description: "Минимальное значение итогового коэффициента",
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	minFinalCoefficient?: number;

	@ApiPropertyOptional({
		example: 5.0,
		description: "Максимальное значение итогового коэффициента",
	})
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	maxFinalCoefficient?: number;

	@ApiPropertyOptional({
		example: "2024-01-01",
		description: "Дата начала периода (YYYY-MM-DD)",
	})
	@IsOptional()
	@IsString()
	createdFrom?: string;

	@ApiPropertyOptional({
		example: "2024-12-31",
		description: "Дата окончания периода (YYYY-MM-DD)",
	})
	@IsOptional()
	@IsString()
	createdTo?: string;

	@ApiPropertyOptional({
		example: "completed",
		description: "Статус заявки",
		enum: ["draft", "in_progress", "completed"],
	})
	@IsOptional()
	@IsString()
	status?: string;

	@ApiPropertyOptional({
		example: "createdAt",
		description: "Поле для сортировки",
		enum: ["name", "createdAt", "finalCoefficient"],
	})
	@IsOptional()
	@IsIn(["name", "createdAt", "finalCoefficient"])
	field?: SortField;

	@ApiPropertyOptional({
		example: "DESC",
		description: "Направление сортировки",
		enum: ["ASC", "DESC"],
	})
	@IsOptional()
	@IsIn(["ASC", "DESC"])
	order?: SortOrder;

	@ApiPropertyOptional({
		example:
			"550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001",
		description: "ID расчетов через запятую",
	})
	@IsOptional()
	@IsString()
	selectedIds?: string;
}

export interface TransformedExportCalculationDto extends ExportCalculationDto {
	selectedIdsArray?: string[];
}
