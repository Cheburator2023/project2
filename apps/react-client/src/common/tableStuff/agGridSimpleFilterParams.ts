import type { ITextFilterParams, INumberFilterParams } from "ag-grid-community";

/** Одно условие без блока «И / ИЛИ» в попапе фильтра. */
export const AG_GRID_SIMPLE_TEXT_FILTER_PARAMS: ITextFilterParams = {
	maxNumConditions: 1,
	buttons: ["clear", "apply"],
	closeOnApply: true,
};

export const AG_GRID_SIMPLE_NUMBER_FILTER_PARAMS: INumberFilterParams = {
	maxNumConditions: 1,
	buttons: ["clear", "apply"],
	closeOnApply: true,
};
