import { calculationResult } from "@react-client/features/home/colDefs/calculationResult";
import { meta } from "@react-client/features/home/colDefs/meta";
import { questionnaire } from "@react-client/features/home/colDefs/questionnaire";
import { CalculationPreviewCell } from "@react-client/features/home/molecules/CalculationPreviewCell";
import { ColDef } from "ag-grid-community";
export const _columnDefs: ColDef<any, any>[] = [
	{
		field: "UI_PREVIEW",
		headerName: "",
		pinned: "right",
		lockPinned: true,
		filter: false,
		sortable: false,
		suppressColumnsToolPanel: true,
		suppressFiltersToolPanel: true,
		suppressHeaderFilterButton: true,
		suppressFloatingFilterButton: true,
		suppressFillHandle: true,
		suppressAutoSize: true,
		suppressSizeToFit: true,
		suppressMovable: true,
		suppressHeaderMenuButton: true,
		width: 120,
		maxWidth: 120,
		minWidth: 120,
		cellRenderer: CalculationPreviewCell,
	},
	...meta,
	...calculationResult,
	...questionnaire,
];
