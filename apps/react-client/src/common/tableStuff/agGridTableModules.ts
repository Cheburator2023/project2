import {
	AllCommunityModule,
	ClientSideRowModelModule,
	ModuleRegistry,
} from "ag-grid-community";
import {
	ColumnsToolPanelModule,
	FiltersToolPanelModule,
	RowGroupingModule,
	SideBarModule,
} from "ag-grid-enterprise";

let registered = false;

/** Регистрирует community + sidebar tool panels (enterprise) один раз. */
export function registerAgGridTableModules(): void {
	if (registered) return;
	ModuleRegistry.registerModules([
		AllCommunityModule,
		ClientSideRowModelModule,
		SideBarModule,
		ColumnsToolPanelModule,
		FiltersToolPanelModule,
		RowGroupingModule,
	]);
	registered = true;
}
