import {
	themeMaterial,
	iconOverrides,
	colorSchemeDarkBlue,
	themeAlpine,
	themeQuartz,
} from "ag-grid-community";

export const agGridCustomMUITheme = themeQuartz;

export const agGridCustomMUIThemeDark =
	agGridCustomMUITheme.withPart(colorSchemeDarkBlue);
