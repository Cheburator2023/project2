import type { GetMainMenuItems, GetMainMenuItemsParams } from "ag-grid-community";

const DEFAULT_HIDDEN_COLUMN_MENU_ITEMS = ["columnChooser"] as const;

export function createAgGridMainMenuItems(
	hiddenItems: readonly string[] = DEFAULT_HIDDEN_COLUMN_MENU_ITEMS,
): GetMainMenuItems {
	return (params: GetMainMenuItemsParams) =>
		params.defaultItems.filter(
			(item) => typeof item !== "string" || !hiddenItems.includes(item),
		) as typeof params.defaultItems;
}

/** Скрывает «Choose Columns» — выбор колонок через sidebar. */
export const getAgGridMainMenuItems = createAgGridMainMenuItems();

/** Как getAgGridMainMenuItems, плюс скрывает группировку по строкам. */
export const getAgGridMainMenuItemsWithoutRowGroup = createAgGridMainMenuItems([
	...DEFAULT_HIDDEN_COLUMN_MENU_ITEMS,
	"rowGroup",
]);
