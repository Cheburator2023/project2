import { Injectable, Logger } from "@nestjs/common";
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
export class InMemoryFilterService {
	private readonly logger = new Logger(InMemoryFilterService.name);

	applyFiltersAndSort(
		calculations: Calculation[],
		filterModel?: AgGridFilterModel,
		sortModel?: AgGridSortModel[],
	): Calculation[] {
		let result = [...calculations];

		if (filterModel) {
			result = this.applyFilters(result, filterModel);
		}

		if (sortModel && sortModel.length > 0) {
			result = this.applySort(result, sortModel);
		}

		return result;
	}

	private applyFilters(
		calculations: Calculation[],
		filterModel: AgGridFilterModel,
	): Calculation[] {
		return calculations.filter((calculation) => {
			for (const [columnId, filter] of Object.entries(filterModel)) {
				if (!this.passesFilter(calculation, columnId, filter)) {
					return false;
				}
			}
			return true;
		});
	}

	private passesFilter(
		calculation: Calculation,
		columnId: string,
		filter: AgGridColumnFilter,
	): boolean {
		if ("operator" in filter) {
			return this.passesCombinedFilter(calculation, columnId, filter);
		} else {
			return this.passesSingleFilter(calculation, columnId, filter);
		}
	}

	private passesCombinedFilter(
		calculation: Calculation,
		columnId: string,
		filter: AgGridCombinedFilter,
	): boolean {
		const result1 = this.passesSingleFilter(
			calculation,
			columnId,
			filter.condition1,
		);
		const result2 = this.passesSingleFilter(
			calculation,
			columnId,
			filter.condition2,
		);

		return filter.operator === "AND" ? result1 && result2 : result1 || result2;
	}

	private passesSingleFilter(
		calculation: Calculation,
		columnId: string,
		filter:
			| AgGridTextFilter
			| AgGridNumberFilter
			| AgGridDateFilter
			| AgGridSetFilter,
	): boolean {
		const value = this.getValueFromCalculation(calculation, columnId);

		switch (filter.filterType) {
			case "text":
				return this.passesTextFilter(value, filter);
			case "number":
				return this.passesNumberFilter(value, filter);
			case "date":
				return this.passesDateFilter(value, filter);
			case "set":
				return this.passesSetFilter(value, filter);
			default:
				this.logger.warn(
					`Неподдерживаемый тип фильтра: ${(filter as any).filterType}`,
				);
				return true;
		}
	}

	private getValueFromCalculation(
		calculation: Calculation,
		columnId: string,
	): any {
		const directMapping: Record<string, any> = {
			calcName: calculation.calcName,
			name: calculation.calcName,
			finalCoefficient: calculation.finalCoefficient,
			createdAt: calculation.createdAt,
			author: calculation.author,
			rfd: calculation.rfd,
			streamExecutor: calculation.streamExecutor,
			department: calculation.department,
			customerName: calculation.customerName,
			comment: calculation.comment,
			id: calculation.id,
            status: calculation.status,
            version: calculation.version,
            seriesId: calculation.seriesId,
            parentCalcId: calculation.parentCalcId,
            readableId: calculation.readableId,
		};

		if (Object.hasOwn(directMapping, columnId)) {
			return directMapping[columnId];
		}

		// Handle calculation result columns with valueGetter logic
		if (columnId.startsWith("questionnaireData.calculationResult.")) {
			return this.getCalculationResultValue(calculation, columnId);
		}

		// Handle algorithm type columns with valueGetter logic
		if (columnId.startsWith("questionnaireData.algorithmType.")) {
			return this.getAlgorithmTypeValue(calculation, columnId);
		}

		// Handle general uncertainty column with valueGetter logic
		if (columnId === "questionnaireData.generalUncertainty") {
			return this.getGeneralUncertaintyValue(calculation);
		}

		// Handle algorithm complexity column with valueGetter logic
		if (columnId === "questionnaireData.algorithmComplexity") {
			return this.getAlgorithmComplexityValue(calculation);
		}

		// Handle other questionnaireData fields with simple path extraction
		if (columnId.startsWith("questionnaireData.")) {
			const path = columnId.substring("questionnaireData.".length);
			return this.getNestedValue(calculation.questionnaireData, path);
		}

		return undefined;
	}

	private getCalculationResultValue(
		calculation: Calculation,
		columnId: string,
	): any {
		// Extract index from field like "questionnaireData.calculationResult.0.stageName"
		const regex = /questionnaireData\.calculationResult\.(\d+)\./;
		const match = columnId.match(regex);
		const index = match ? Number.parseInt(match[1], 10) : 0;

		const calculationResults = calculation.questionnaireData?.calculationResult;
		if (!Array.isArray(calculationResults) || !calculationResults[index]) {
			return null;
		}

		// For the first two columns (index 0), we need to determine if it's score or offset
		// Based on the frontend column definitions:
		// - "Итоговая оценка" uses score
		// - "% Отклонение итоговой оценки от средней" uses offset
		// For other indices, we use score
		let key = "score";
		if (index === 0) {
			// We need to distinguish between score and offset for index 0
			// Since both columns use the same field path, we'll check if this is the second occurrence
			// This is a limitation - we'll default to score for now
			key = "score";
		}

		const rawValue = calculationResults[index][key];
		if (rawValue === null || rawValue === undefined) {
			return null;
		}

		const numericValue = Number(rawValue);
		return Number.isNaN(numericValue) ? null : numericValue;
	}

	private getAlgorithmTypeValue(
		calculation: Calculation,
		columnId: string,
	): boolean {
		// Extract algorithm type from field like "questionnaireData.algorithmType.0.keyName"
		const algorithms = calculation.questionnaireData?.algorithmComplexity || [];

		// Map indices to algorithm types based on frontend column definitions
		const algorithmTypeMap: Record<string, string> = {
			"0": "Табличные данные",
			"1": "Текстовая аналитика_Классические модели",
			"2": "Текстовая аналитика_LLM",
			"3": "Аудио Аналитика",
			"4": "Компьютерное зрение_CV",
		};

		const regex = /questionnaireData\.algorithmType\.(\d+)\./;
		const match = columnId.match(regex);
		const index = match ? match[1] : "0";
		const targetAlgorithmType = algorithmTypeMap[index];

		if (!targetAlgorithmType) {
			return false;
		}

		return algorithms.some(
			(alg: any) => alg.algorithmType === targetAlgorithmType,
		);
	}

	private getGeneralUncertaintyValue(calculation: Calculation): number {
		const generalUncertaintyData =
			calculation.questionnaireData?.generalUncertainty;

		if (Array.isArray(generalUncertaintyData)) {
			return generalUncertaintyData.length;
		}

		if (generalUncertaintyData && typeof generalUncertaintyData === "object") {
			return Object.keys(generalUncertaintyData).length;
		}

		return 0;
	}

	private getAlgorithmComplexityValue(calculation: Calculation): string {
		// This mimics the frontend valueGetter for algorithmComplexity
		const algorithms = calculation.questionnaireData?.algorithmComplexity || [];
		const totalCount = algorithms.length;
		const nonEmptyCount = algorithms.filter(
			(alg: any) => alg.algorithmType && alg.algorithmType.trim() !== "",
		).length;
		return `Выбрано типов алгоритмов: ${nonEmptyCount} из ${totalCount}`;
	}

	private getNestedValue(obj: any, path: string): any {
		if (!obj || !path) return undefined;

		const parts = path.split(".");
		let current = obj;

		for (const part of parts) {
			if (current === null || current === undefined) {
				return undefined;
			}

			if (Array.isArray(current)) {
				const index = Number.parseInt(part, 10);
				if (!Number.isNaN(index) && index >= 0 && index < current.length) {
					current = current[index];
				} else {
					return undefined;
				}
			} else if (typeof current === "object") {
				current = current[part];
			} else {
				return undefined;
			}
		}

		return current;
	}

	private passesTextFilter(value: any, filter: AgGridTextFilter): boolean {
		const stringValue = this.convertToString(value);

		switch (filter.type) {
			case "equals":
				return stringValue === filter.filter;
			case "notEqual":
				return stringValue !== filter.filter;
			case "contains":
				return stringValue.toLowerCase().includes(filter.filter.toLowerCase());
			case "notContains":
				return !stringValue.toLowerCase().includes(filter.filter.toLowerCase());
			case "startsWith":
				return stringValue
					.toLowerCase()
					.startsWith(filter.filter.toLowerCase());
			case "endsWith":
				return stringValue.toLowerCase().endsWith(filter.filter.toLowerCase());
			case "blank":
				return !stringValue || stringValue.trim() === "";
			case "notBlank":
				return Boolean(stringValue && stringValue.trim() !== "");
			default:
				return true;
		}
	}

	private passesNumberFilter(value: any, filter: AgGridNumberFilter): boolean {
		const numValue = this.convertToNumber(value);
		if (numValue === null) {
			return filter.type === "blank";
		}

		switch (filter.type) {
			case "equals":
				return numValue === filter.filter;
			case "notEqual":
				return numValue !== filter.filter;
			case "lessThan":
				return numValue < filter.filter;
			case "lessThanOrEqual":
				return numValue <= filter.filter;
			case "greaterThan":
				return numValue > filter.filter;
			case "greaterThanOrEqual":
				return numValue >= filter.filter;
			case "inRange":
				return (
					numValue >= filter.filter &&
					numValue <= (filter.filterTo ?? Number.MAX_VALUE)
				);
			case "blank":
				return false;
			case "notBlank":
				return true;
			default:
				return true;
		}
	}

	private passesDateFilter(value: any, filter: AgGridDateFilter): boolean {
		const dateValue = this.convertToDate(value);
		if (!dateValue) {
			return filter.type === "blank";
		}

		const filterDate = new Date(filter.dateFrom);
		const filterDateTo = filter.dateTo ? new Date(filter.dateTo) : null;

		switch (filter.type) {
			case "equals":
				return this.isSameDate(dateValue, filterDate);
			case "notEqual":
				return !this.isSameDate(dateValue, filterDate);
			case "lessThan":
				return dateValue < filterDate;
			case "greaterThan":
				return dateValue > filterDate;
			case "inRange":
				return filterDateTo
					? dateValue >= filterDate && dateValue <= filterDateTo
					: false;
			case "blank":
				return false;
			case "notBlank":
				return true;
			default:
				return true;
		}
	}

	private passesSetFilter(value: any, filter: AgGridSetFilter): boolean {
		if (filter.values.length === 0) {
			return false;
		}

		const stringValue = this.convertToString(value);
		return filter.values.includes(stringValue);
	}

	private applySort(
		calculations: Calculation[],
		sortModel: AgGridSortModel[],
	): Calculation[] {
		return calculations.sort((a, b) => {
			for (const sort of sortModel) {
				const valueA = this.getValueFromCalculation(a, sort.colId);
				const valueB = this.getValueFromCalculation(b, sort.colId);

				const comparison = this.compareValues(valueA, valueB);
				if (comparison !== 0) {
					return sort.sort === "asc" ? comparison : -comparison;
				}
			}
			return 0;
		});
	}

	private compareValues(a: any, b: any): number {
		if (a === null || a === undefined) {
			return b === null || b === undefined ? 0 : -1;
		}
		if (b === null || b === undefined) {
			return 1;
		}

		if (typeof a === "number" && typeof b === "number") {
			return a - b;
		}

		if (a instanceof Date && b instanceof Date) {
			return a.getTime() - b.getTime();
		}

		const stringA = this.convertToString(a);
		const stringB = this.convertToString(b);
		return stringA.localeCompare(stringB);
	}

	private convertToString(value: any): string {
		if (value === null || value === undefined) {
			return "";
		}
		if (Array.isArray(value)) {
			return value.join(", ");
		}
		return String(value);
	}

	private convertToNumber(value: any): number | null {
		if (value === null || value === undefined || value === "") {
			return null;
		}
		const num = Number(value);
		return Number.isNaN(num) ? null : num;
	}

	private convertToDate(value: any): Date | null {
		if (value === null || value === undefined) {
			return null;
		}
		if (value instanceof Date) {
			return value;
		}
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	private isSameDate(date1: Date, date2: Date): boolean {
		return (
			date1.getFullYear() === date2.getFullYear() &&
			date1.getMonth() === date2.getMonth() &&
			date1.getDate() === date2.getDate()
		);
	}
}
