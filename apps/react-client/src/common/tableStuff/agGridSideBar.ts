import type { SideBarDef } from "ag-grid-community";
import { AgGridColumnStateToolPanel } from "@react-client/common/tableStuff/AgGridColumnStateToolPanel";

export function createAgGridSideBar(gridStateKey: string): SideBarDef {
	return {
		toolPanels: [
			{
				id: "columns",
				labelDefault: "Столбцы",
				labelKey: "columns",
				iconKey: "columns",
				toolPanel: "agColumnsToolPanel",
				toolPanelParams: {
					suppressPivotMode: true,
					suppressRowGroups: true,
					suppressValues: true,
				},
			},
			{
				id: "filters",
				labelDefault: "Фильтры",
				labelKey: "filters",
				iconKey: "filter",
				toolPanel: "agFiltersToolPanel",
			},
			{
				id: "settings",
				labelDefault: "Настройки",
				labelKey: "settings",
				iconKey: "menu",
				toolPanel: AgGridColumnStateToolPanel,
				toolPanelParams: { gridStateKey },
			},
		],
		position: "right",
		defaultToolPanel: "",
	};
}
