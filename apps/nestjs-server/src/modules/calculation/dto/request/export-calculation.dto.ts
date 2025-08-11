import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn, IsObject } from "class-validator";
import { Type } from "class-transformer";

export type SortField =
	| "calcName"
	| "createdAt"
	| "finalCoefficient"
	| "author"
	| "department"
	| "streamExecutor";
export type SortOrder = "ASC" | "DESC";

export interface AgGridTextFilter {
	filterType: "text";
	type:
		| "equals"
		| "notEqual"
		| "contains"
		| "notContains"
		| "startsWith"
		| "endsWith"
		| "blank"
		| "notBlank";
	filter: string;
}

export interface AgGridNumberFilter {
	filterType: "number";
	type:
		| "equals"
		| "notEqual"
		| "lessThan"
		| "lessThanOrEqual"
		| "greaterThan"
		| "greaterThanOrEqual"
		| "inRange"
		| "blank"
		| "notBlank";
	filter: number;
	filterTo?: number;
}

export interface AgGridDateFilter {
	filterType: "date";
	type:
		| "equals"
		| "notEqual"
		| "lessThan"
		| "greaterThan"
		| "inRange"
		| "blank"
		| "notBlank";
	dateFrom: string;
	dateTo?: string;
}

export interface AgGridSetFilter {
	filterType: "set";
	values: string[];
}

export interface AgGridCombinedFilter {
	filterType: "text" | "number" | "date" | "set";
	operator: "AND" | "OR";
	condition1:
		| AgGridTextFilter
		| AgGridNumberFilter
		| AgGridDateFilter
		| AgGridSetFilter;
	condition2:
		| AgGridTextFilter
		| AgGridNumberFilter
		| AgGridDateFilter
		| AgGridSetFilter;
	conditions?: (
		| AgGridTextFilter
		| AgGridNumberFilter
		| AgGridDateFilter
		| AgGridSetFilter
	)[];
}

export type AgGridColumnFilter =
	| AgGridTextFilter
	| AgGridNumberFilter
	| AgGridDateFilter
	| AgGridSetFilter
	| AgGridCombinedFilter;

export interface AgGridFilterModel {
	[columnId: string]: AgGridColumnFilter;
}

export interface AgGridSortModel {
	colId: string;
	sort: "asc" | "desc";
}

export class ExportCalculationDto {
	@ApiPropertyOptional({
		description: "Модель фильтров ag-Grid в формате JSON",
		example: {
			calcName: {
				filterType: "text",
				type: "contains",
				filter: "Оценка",
			},
			finalCoefficient: {
				filterType: "number",
				type: "greaterThan",
				filter: 1.5,
			},
		},
	})
	@IsOptional()
	@IsString()
	filterModel?: string;

	@ApiPropertyOptional({
		description: "Модель сортировки ag-Grid в формате JSON",
		example: '[{"colId": "createdAt", "sort": "desc"}]',
	})
	@IsOptional()
	@IsString()
	sortModel?: string;

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
	parsedFilterModel?: AgGridFilterModel;
	parsedSortModel?: AgGridSortModel[];
}
