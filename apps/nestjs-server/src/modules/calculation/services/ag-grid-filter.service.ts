import { Injectable } from "@nestjs/common";
import { SelectQueryBuilder } from "typeorm";
import {
	AgGridFilterModel,
	AgGridSortModel,
	AgGridTextFilter,
	AgGridNumberFilter,
	AgGridDateFilter,
	AgGridSetFilter,
	AgGridCombinedFilter,
	AgGridColumnFilter,
} from "../dto/request/export-calculation.dto";
import { Calculation } from "../entities/calculation.entity";

@Injectable()
export class AgGridFilterService {
	applyFiltersToQuery(
		queryBuilder: SelectQueryBuilder<Calculation>,
		filterModel?: AgGridFilterModel,
	): void {
		if (!filterModel) return;

		for (const [columnId, filter] of Object.entries(filterModel)) {
			this.applyColumnFilter(queryBuilder, columnId, filter);
		}
	}

	applySortToQuery(
		queryBuilder: SelectQueryBuilder<Calculation>,
		sortModel?: AgGridSortModel[],
	): void {
		if (!sortModel || sortModel.length === 0) {
			queryBuilder.orderBy("calculation.createdAt", "DESC");
			return;
		}

		sortModel.forEach((sort, index) => {
			const columnName = this.mapColumnIdToDbField(sort.colId);
			const direction = sort.sort.toUpperCase() as "ASC" | "DESC";

			if (index === 0) {
				queryBuilder.orderBy(`calculation.${columnName}`, direction);
			} else {
				queryBuilder.addOrderBy(`calculation.${columnName}`, direction);
			}
		});
	}

	private applyColumnFilter(
		queryBuilder: SelectQueryBuilder<Calculation>,
		columnId: string,
		filter: AgGridColumnFilter,
	): void {
		if ("operator" in filter) {
			this.applyCombinedFilter(queryBuilder, columnId, filter);
		} else {
			this.applySingleFilter(queryBuilder, columnId, filter);
		}
	}

	private applyCombinedFilter(
		queryBuilder: SelectQueryBuilder<Calculation>,
		columnId: string,
		filter: AgGridCombinedFilter,
	): void {
		const condition1 = this.buildFilterCondition(columnId, filter.condition1);
		const condition2 = this.buildFilterCondition(columnId, filter.condition2);

		if (filter.operator === "AND") {
			queryBuilder.andWhere(`(${condition1.sql} AND ${condition2.sql})`, {
				...condition1.params,
				...condition2.params,
			});
		} else {
			queryBuilder.andWhere(`(${condition1.sql} OR ${condition2.sql})`, {
				...condition1.params,
				...condition2.params,
			});
		}
	}

	private applySingleFilter(
		queryBuilder: SelectQueryBuilder<Calculation>,
		columnId: string,
		filter:
			| AgGridTextFilter
			| AgGridNumberFilter
			| AgGridDateFilter
			| AgGridSetFilter,
	): void {
		const condition = this.buildFilterCondition(columnId, filter);
		queryBuilder.andWhere(condition.sql, condition.params);
	}

	private buildFilterCondition(
		columnId: string,
		filter:
			| AgGridTextFilter
			| AgGridNumberFilter
			| AgGridDateFilter
			| AgGridSetFilter,
	): { sql: string; params: Record<string, any> } {
		const columnName = this.mapColumnIdToDbField(columnId);
		const paramKey = `${columnId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		switch (filter.filterType) {
			case "text":
				return this.buildTextFilterCondition(columnName, filter, paramKey);
			case "number":
				return this.buildNumberFilterCondition(columnName, filter, paramKey);
			case "date":
				return this.buildDateFilterCondition(columnName, filter, paramKey);
			case "set":
				return this.buildSetFilterCondition(columnName, filter, paramKey);
			default:
				throw new Error(
					`Неподдерживаемый тип фильтра: ${(filter as any).filterType}`,
				);
		}
	}

	private buildTextFilterCondition(
		columnName: string,
		filter: AgGridTextFilter,
		paramKey: string,
	): { sql: string; params: Record<string, any> } {
		const field = `calculation.${columnName}`;

		switch (filter.type) {
			case "equals":
				return {
					sql: `${field} = :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "notEqual":
				return {
					sql: `${field} != :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "contains":
				return {
					sql: `${field} ILIKE :${paramKey}`,
					params: { [paramKey]: `%${filter.filter}%` },
				};
			case "notContains":
				return {
					sql: `${field} NOT ILIKE :${paramKey}`,
					params: { [paramKey]: `%${filter.filter}%` },
				};
			case "startsWith":
				return {
					sql: `${field} ILIKE :${paramKey}`,
					params: { [paramKey]: `${filter.filter}%` },
				};
			case "endsWith":
				return {
					sql: `${field} ILIKE :${paramKey}`,
					params: { [paramKey]: `%${filter.filter}` },
				};
			case "blank":
				return {
					sql: `(${field} IS NULL OR ${field} = '')`,
					params: {},
				};
			case "notBlank":
				return {
					sql: `(${field} IS NOT NULL AND ${field} != '')`,
					params: {},
				};
			default:
				throw new Error(
					`Неподдерживаемый тип текстового фильтра: ${filter.type}`,
				);
		}
	}

	private buildNumberFilterCondition(
		columnName: string,
		filter: AgGridNumberFilter,
		paramKey: string,
	): { sql: string; params: Record<string, any> } {
		const isJsonField = columnName.includes("->");
		const field = isJsonField
			? `(calculation.${columnName})::numeric`
			: `calculation.${columnName}`;

		switch (filter.type) {
			case "equals":
				return {
					sql: `${field} = :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "notEqual":
				return {
					sql: `${field} != :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "lessThan":
				return {
					sql: `${field} < :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "lessThanOrEqual":
				return {
					sql: `${field} <= :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "greaterThan":
				return {
					sql: `${field} > :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "greaterThanOrEqual":
				return {
					sql: `${field} >= :${paramKey}`,
					params: { [paramKey]: filter.filter },
				};
			case "inRange":
				return {
					sql: `${field} BETWEEN :${paramKey}_from AND :${paramKey}_to`,
					params: {
						[`${paramKey}_from`]: filter.filter,
						[`${paramKey}_to`]: filter.filterTo,
					},
				};
			case "blank":
				return {
					sql: `${field} IS NULL`,
					params: {},
				};
			case "notBlank":
				return {
					sql: `${field} IS NOT NULL`,
					params: {},
				};
			default:
				throw new Error(
					`Неподдерживаемый тип числового фильтра: ${filter.type}`,
				);
		}
	}

	private buildDateFilterCondition(
		columnName: string,
		filter: AgGridDateFilter,
		paramKey: string,
	): { sql: string; params: Record<string, any> } {
		const isJsonField = columnName.includes("->");
		const field = isJsonField
			? `(calculation.${columnName})::timestamp`
			: `calculation.${columnName}`;

		switch (filter.type) {
			case "equals":
				return {
					sql: `DATE(${field}) = DATE(:${paramKey})`,
					params: { [paramKey]: filter.dateFrom },
				};
			case "notEqual":
				return {
					sql: `DATE(${field}) != DATE(:${paramKey})`,
					params: { [paramKey]: filter.dateFrom },
				};
			case "lessThan":
				return {
					sql: `${field} < :${paramKey}`,
					params: { [paramKey]: filter.dateFrom },
				};
			case "greaterThan":
				return {
					sql: `${field} > :${paramKey}`,
					params: { [paramKey]: filter.dateFrom },
				};
			case "inRange":
				return {
					sql: `${field} BETWEEN :${paramKey}_from AND :${paramKey}_to`,
					params: {
						[`${paramKey}_from`]: filter.dateFrom,
						[`${paramKey}_to`]: filter.dateTo,
					},
				};
			case "blank":
				return {
					sql: `${field} IS NULL`,
					params: {},
				};
			case "notBlank":
				return {
					sql: `${field} IS NOT NULL`,
					params: {},
				};
			default:
				throw new Error(`Неподдерживаемый тип фильтра даты: ${filter.type}`);
		}
	}

	private buildSetFilterCondition(
		columnName: string,
		filter: AgGridSetFilter,
		paramKey: string,
	): { sql: string; params: Record<string, any> } {
		const field = `calculation.${columnName}`;

		if (filter.values.length === 0) {
			return {
				sql: "1 = 0",
				params: {},
			};
		}

		return {
			sql: `${field} IN (:...${paramKey})`,
			params: { [paramKey]: filter.values },
		};
	}

	private mapColumnIdToDbField(columnId: string): string {
		const mapping: Record<string, string> = {
			calcName: "calcName",
			name: "calcName",
			finalCoefficient: "finalCoefficient",
			createdAt: "createdAt",
			author: "author",
			rfd: "rfd",
			streamExecutor: "streamExecutor",
			department: "department",
			customerName: "customerName",
			comment: "comment",
		};

		if (mapping[columnId]) {
			return mapping[columnId];
		}

		if (columnId.startsWith("questionnaireData.")) {
			const jsonPath = columnId.substring("questionnaireData.".length);
			const pathParts = jsonPath.split(".");

			let jsonPathExpression = "questionnaireData";
			for (let i = 0; i < pathParts.length; i++) {
				const part = pathParts[i];
				const isLastPart = i === pathParts.length - 1;

				if (/^\d+$/.test(part)) {
					jsonPathExpression += `->${part}`;
				} else {
					if (isLastPart) {
						jsonPathExpression += `->>'${part}'`;
					} else {
						jsonPathExpression += `->'${part}'`;
					}
				}
			}

			return jsonPathExpression;
		}

		return columnId;
	}
}
