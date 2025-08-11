import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import {
	ExportCalculationDto,
	TransformedExportCalculationDto,
	AgGridFilterModel,
	AgGridSortModel,
} from "../dto/request/export-calculation.dto";

@Injectable()
export class ExportValidationPipe
	implements
		PipeTransform<ExportCalculationDto, TransformedExportCalculationDto>
{
	transform(value: ExportCalculationDto): TransformedExportCalculationDto {
		const transformed: TransformedExportCalculationDto = { ...value };

		if (transformed.selectedIds) {
			transformed.selectedIdsArray = transformed.selectedIds
				.split(",")
				.map((id) => id.trim())
				.filter((id) => id.length > 0);

			if (transformed.selectedIdsArray.length === 0) {
				throw new BadRequestException(
					"Необходимо указать хотя бы один валидный ID в selectedIds",
				);
			}
		}

		if (transformed.filterModel) {
			try {
				transformed.parsedFilterModel = JSON.parse(
					transformed.filterModel,
				) as AgGridFilterModel;
				this.validateFilterModel(transformed.parsedFilterModel);
			} catch (error) {
				throw new BadRequestException(
					`Неверный формат filterModel: ${error.message}`,
				);
			}
		}

		if (transformed.sortModel) {
			try {
				transformed.parsedSortModel = JSON.parse(
					transformed.sortModel,
				) as AgGridSortModel[];
				this.validateSortModel(transformed.parsedSortModel);
			} catch (error) {
				throw new BadRequestException(
					`Неверный формат sortModel: ${error.message}`,
				);
			}
		}

		return transformed;
	}

	private validateFilterModel(filterModel: AgGridFilterModel): void {
		if (!filterModel || typeof filterModel !== "object") {
			throw new Error("filterModel должен быть объектом");
		}

		for (const [columnId, filter] of Object.entries(filterModel)) {
			if (!filter.filterType) {
				throw new Error(`Отсутствует filterType для колонки ${columnId}`);
			}

			if (!["text", "number", "date", "set"].includes(filter.filterType)) {
				throw new Error(
					`Неподдерживаемый filterType: ${filter.filterType} для колонки ${columnId}`,
				);
			}

			if ("operator" in filter) {
				if (!["AND", "OR"].includes(filter.operator)) {
					throw new Error(
						`Неподдерживаемый operator: ${filter.operator} для колонки ${columnId}`,
					);
				}
				if (!filter.condition1 || !filter.condition2) {
					throw new Error(
						`Отсутствуют condition1 или condition2 для комбинированного фильтра колонки ${columnId}`,
					);
				}
			}

			if (filter.filterType === "date") {
				const dateFilter = filter as any;
				if (
					dateFilter.dateFrom &&
					Number.isNaN(Date.parse(dateFilter.dateFrom))
				) {
					throw new Error(`Неверный формат dateFrom для колонки ${columnId}`);
				}
				if (dateFilter.dateTo && Number.isNaN(Date.parse(dateFilter.dateTo))) {
					throw new Error(`Неверный формат dateTo для колонки ${columnId}`);
				}
			}
		}
	}

	private validateSortModel(sortModel: AgGridSortModel[]): void {
		if (!Array.isArray(sortModel)) {
			throw new Error("sortModel должен быть массивом");
		}

		for (const sort of sortModel) {
			if (!sort.colId) {
				throw new Error("Отсутствует colId в sortModel");
			}
			if (!["asc", "desc"].includes(sort.sort)) {
				throw new Error(
					`Неподдерживаемое направление сортировки: ${sort.sort}`,
				);
			}
		}
	}
}
