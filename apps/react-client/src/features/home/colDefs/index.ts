import { calculationResult } from "@react-client/features/home/colDefs/calculationResult";
import { meta } from "@react-client/features/home/colDefs/meta";
import { questionnaire } from "@react-client/features/home/colDefs/questionnaire";
import { ColDef } from "ag-grid-community";

export const UI_COL_NAMES = {
	UI_PREVIEW: "UI_PREVIEW",
};

export const _columnDefs: ColDef<any, any>[] = [
	// {
	// 	field: UI_COL_NAMES.UI_PREVIEW,
	// 	headerName: "",
	// 	pinned: "left",
	// 	lockPinned: true,
	// 	filter: false,
	// 	sortable: false,
	// 	suppressColumnsToolPanel: true,
	// 	suppressFiltersToolPanel: true,
	// 	suppressHeaderFilterButton: true,
	// 	suppressFloatingFilterButton: true,
	// 	suppressFillHandle: true,
	// 	suppressAutoSize: true,
	// 	suppressSizeToFit: true,
	// 	suppressMovable: true,
	// 	suppressHeaderContextMenu: true,
	// 	floatingFilter: false,
	// 	suppressHeaderMenuButton: true,
	// 	width: 120,
	// 	maxWidth: 120,
	// 	minWidth: 120,
	// 	cellRenderer: CalculationPreviewCell,
	// },
	...meta,
	...calculationResult,
	...questionnaire,
];
