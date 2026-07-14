import type { ISetFilterParams } from "ag-grid-community";

/** Set Filter: выбор значений чекбоксами (см. ag-grid filter-set). */
export const AG_GRID_SET_FILTER_PARAMS: ISetFilterParams = {
	buttons: ["clear", "apply"],
	closeOnApply: true,
};

export function formatAgGridSetFilterDateValue(value: unknown): string {
	if (value == null || value === "") return "";
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleString("ru-RU");
}
