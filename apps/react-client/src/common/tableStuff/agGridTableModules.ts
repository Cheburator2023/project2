import {
	AllCommunityModule,
	ClientSideRowModelModule,
	ModuleRegistry,
} from "ag-grid-community";
import {
	ColumnMenuModule,
	ColumnsToolPanelModule,
	ContextMenuModule,
	FiltersToolPanelModule,
	RowGroupingModule,
	SideBarModule,
} from "ag-grid-enterprise";

let registered = false;

/** Регистрирует community + sidebar/menu modules (enterprise) один раз. */
export function registerAgGridTableModules(): void {
	if (registered) return;
	ModuleRegistry.registerModules([
		AllCommunityModule,
		ClientSideRowModelModule,
		SideBarModule,
		ColumnsToolPanelModule,
		FiltersToolPanelModule,
		RowGroupingModule,
		ColumnMenuModule,
		ContextMenuModule,
	]);
	registered = true;
}
