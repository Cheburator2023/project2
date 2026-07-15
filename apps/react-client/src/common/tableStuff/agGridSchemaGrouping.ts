import type { ColDef } from "ag-grid-community";

/** Колонка-группа «Схема» для реестров формул/работ. */
export const AG_GRID_SCHEMA_GROUP_AUTO_COLUMN: ColDef = {
	headerName: "Схема",
	minWidth: 160,
	flex: 1,
	cellRendererParams: {
		suppressCount: false,
	},
};

export function readAgGridSchemaGroupLabel(
	templateName: string | null | undefined,
): string {
	const trimmed = templateName?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : "— (глобальная)";
}
