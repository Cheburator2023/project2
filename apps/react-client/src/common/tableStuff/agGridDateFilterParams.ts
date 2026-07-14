import type { IDateFilterParams } from "ag-grid-community";

function localIsoDay(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function isoDayFromCellValue(cellValue: unknown): string | null {
	if (cellValue == null || cellValue === "") return null;
	const date = new Date(String(cellValue));
	if (Number.isNaN(date.getTime())) return null;
	return localIsoDay(date);
}

/** Сравнение ISO-даты ячейки с локальной полуночью из фильтра AG Grid. */
export function compareAgGridDateFilterValue(
	filterLocalDateAtMidnight: Date,
	cellValue: unknown,
): number {
	const cellDay = isoDayFromCellValue(cellValue);
	if (!cellDay) return -1;
	const filterDay = localIsoDay(filterLocalDateAtMidnight);
	if (cellDay === filterDay) return 0;
	return cellDay < filterDay ? -1 : 1;
}

/** Параметры agDateColumnFilter для ISO-строк (createdAt, поля схемы типа date). */
export const AG_GRID_DATE_FILTER_PARAMS: IDateFilterParams = {
	buttons: ["clear", "apply"],
	closeOnApply: true,
	maxNumConditions: 1,
	inRangeInclusive: true,
	comparator: compareAgGridDateFilterValue,
	minValidYear: 2000,
};
