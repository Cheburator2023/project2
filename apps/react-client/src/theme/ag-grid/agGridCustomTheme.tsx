import { colorSchemeDarkBlue, themeQuartz } from "ag-grid-community";

/** Единая плотность таблиц для всего приложения (F5 и SPA-переходы). */
export const AG_GRID_DENSITY_PARAMS = {
	fontSize: 12,
	spacing: 5,
} as const;

export const agGridCustomMUITheme = themeQuartz.withParams(AG_GRID_DENSITY_PARAMS);

export const agGridCustomMUIThemeDark =
	agGridCustomMUITheme.withPart(colorSchemeDarkBlue);
