import { styled, useColorScheme } from "@mui/material";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import {
	type CellClassParams,
	type CellStyle,
	type ColDef,
	GetMainMenuItemsParams,
	type ValueFormatterParams,
	RowHeightParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useState } from "react";
import {
	agGridCustomMUITheme,
	agGridCustomMUIThemeDark,
} from "../../../theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "../../../theme/ag-grid/agGridIconSet";
import { AG_GRID_LOCALE_RU } from "../../../common/tableStuff/agGridLocale.ru";

interface EpicData {
	stageName: string;
	score: number;
	percentFromAverage?: number;
	offset?: number;
	stageBaseValue?: number;
	disabled?: boolean;
	rowHeight?: number;
}

interface CoefficientData {
	coefficientName: string;
	value: number;
}

export const stageDisplayNames: Record<string, string> = {
	stage01: "01. Постановка задачи",
	stage02: "02. Поиск данных",
	stage04: "04. Построение витрины для разработки",
	stage05A: "05A. Разработка MVP",
	stage05: "05. Разработка модели",
	amlDrafting: "AML разработка",
	stage05B: "05B. Пилотирование модели",
	stage07: "07. Разработка витрины для применения модели",
	stage09: "09. Адаптация и внедрение",
	amlEnforcement: "AML внедрение",
};

export const coefficientDisplayNames: Record<string, string> = {
	modelsCountCoefficient: "Количество моделей",
	setupComplexityCoefficient: "Сложность постановки",
	generalUncertaintyCoefficient: "Общая неопределенность",
	readyPromReportsCoefficient: "Наличие готовых промышленных витрин",
	dataSourcesCountCoefficient: "Количество источников для проработки",
	pilotModelRequired: "Необходимость реализации пилотной модели",
	algorithmComplexityCoefficient: "Сложность алгоритма / тип ML задачи",
	pilotSupportRequired: "Необходимость поддержки проведения пилота",
	autoMlRequired: "Необходимость AutoML",
	productionAdditionalReportsCoefficient:
		"Необходимость продуктивизации и количество дополнительных витрин",
	deploymentChannelsCoefficient:
		"Необходимость продуктивизации и каналы внедрения моделей",
};

export const coefficientToFormFieldMapping: Record<string, string> = {
	modelsCountCoefficient: "modelsCount",
	setupComplexityCoefficient: "setupComplexity",
	generalUncertaintyCoefficient: "generalUncertainty",
	readyPromReportsCoefficient: "readyPromReports",
	dataSourcesCountCoefficient: "dataSourcesCount",
	pilotModelRequired: "pilotModelRequired",
	algorithmComplexityCoefficient: "algorithmComplexity",
	pilotSupportRequired: "pilotSupportRequired",
	autoMlRequired: "autoMlRequired",
	productionAdditionalReportsCoefficient: "productionAdditionalReports",
	deploymentChannelsCoefficient: "productionDeploymentChannels",
};

// Extract calculation results from backend data
const extractCalculationResults = (
	data?: CalculationResponseDto,
): EpicData[] => {
	// Check if calculationResult exists in questionnaireData
	const calculationResult = (data?.questionnaireData as any)?.calculationResult;

	if (calculationResult && Array.isArray(calculationResult)) {
		// Use data from backend if available
		return calculationResult.map((item: any) => ({
			// TODO: убрать этот костыль когда будет выполнена правильная миграция
			stageName: item.stageName.includes("06")
				? stageDisplayNames.stage07
				: item.stageName.includes("07")
					? stageDisplayNames.stage09
					: item.stageName,
			score: item.score,
			stageBaseValue: item.stageBaseValue,
			percentFromAverage: item.percentFromAverage,
			offset: item.offset,
			disabled: item.disabled,
			rowHeight: item.stageName === "Итоговая оценка" ? 60 : undefined,
		}));
	}

	// Return empty array if no calculation results available
	return [];
};

// Extract coefficients from questionnaire data
const extractCoefficients = (
	data?: CalculationResponseDto,
): CoefficientData[] => {
	// Check if coefficients exist in questionnaireData
	const coefficients = (data?.questionnaireData as any)?.coefficients;

	if (coefficients && Array.isArray(coefficients)) {
		return coefficients.map((item: any) => ({
			coefficientName: item.coefficientName,
			value: item.value,
		}));
	}

	// Return empty array if no coefficients available
	return [];
};

export const CalculationResultTablePreview = ({
	initialData,
}: {
	initialData?: CalculationResponseDto;
}) => {
	const { mode } = useColorScheme();

	const rowData = useMemo<EpicData[]>(() => {
		return extractCalculationResults(initialData);
	}, [initialData]);
	console.log(
		"🐸 Pepe said >> CalculationResultTablePreview >> rowData:",
		rowData,
	);

	const coefficientData = useMemo<CoefficientData[]>(() => {
		return extractCoefficients(initialData);
	}, [initialData]);

	const [columnDefs] = useState<ColDef<EpicData>[]>([
		{
			headerName: "Наименование этапа E2E планирования",
			field: "stageName",
			flex: 2,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.stageName === "Итоговая оценка") {
					style.fontWeight = "bold";
					style.fontSize = "20px";
					style.display = "flex";
					style.alignItems = "center";
					style.backgroundColor = "#57b1ff38";
				}

				if (params.data?.disabled) {
					style.opacity = 0.5;
					style.pointerEvents = "none";
				}

				return style;
			},
		},
		{
			headerName: "Базовая оценка по стриму (СФЕРА)",
			field: "stageBaseValue",
			flex: 1,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.stageName === "Итоговая оценка") {
					style.fontWeight = "bold";
					style.fontSize = "20px";
					style.display = "flex";
					style.alignItems = "center";
					style.backgroundColor = "#57b1ff38";
				}

				return style;
			},
		},
		{
			headerName: "Оценка с поправкой на коэффициент сложности",
			field: "score",
			flex: 1,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.stageName === "Итоговая оценка") {
					style.fontWeight = "bold";
					style.fontSize = "20px";
					style.display = "flex";
					style.alignItems = "center";
					style.backgroundColor = "#57b1ff38";
				}

				if (params.data?.disabled) {
					style.opacity = 0.0;
					style.pointerEvents = "none";
				}

				return style;
			},
			valueFormatter: (params: ValueFormatterParams<EpicData>): string => {
				return typeof params.value === "number" ? params.value.toFixed(2) : "";
			},
		},
		{
			headerName: "Отклонение относительно базовой оценки по стриму (Сфера)",
			field: "offset",
			flex: 1,
			valueFormatter: (params: ValueFormatterParams<EpicData>): string => {
				return typeof params.value === "number"
					? `${params.value.toFixed(2)}%`
					: "";
			},
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.stageName === "Итоговая оценка") {
					style.fontSize = "20px";
					style.fontWeight = "bold";
					style.display = "flex";
					style.alignItems = "center";
					style.backgroundColor = "#57b1ff38";
				}

				if (params.value != null) {
					if (params.value > 0) {
						style.color = "red";
					} else if (params.value < 0) {
						style.color = "green";
					}
				}

				if (params.data?.disabled) {
					style.opacity = 0.0;
					style.pointerEvents = "none";
				}

				return style;
			},
		},
	]);

	const [_coefficientColumnDefs] = useState<ColDef<CoefficientData>[]>([
		{
			headerName: "Коэффициент",
			field: "coefficientName",
			flex: 2,
		},
		{
			headerName: "Значение",
			field: "value",
			flex: 1,
			valueFormatter: (
				params: ValueFormatterParams<CoefficientData>,
			): string => {
				return typeof params.value === "number" ? params.value.toFixed(2) : "";
			},
		},
	]);

	const defaultColDef = useMemo<ColDef<EpicData>>(
		() => ({
			resizable: true,
			sortable: true,
			editable: false,
			wrapHeaderText: true,
			autoHeaderHeight: true,
			mainMenuItems: (params: GetMainMenuItemsParams) => {
				return params.defaultItems.filter(
					(item) => item !== "columnChooser" && item !== "rowGroup",
				);
			},
		}),
		[],
	);

	const _defaultCoefficientColDef = useMemo<ColDef<CoefficientData>>(
		() => ({
			resizable: true,
			sortable: true,
			editable: false,
			wrapHeaderText: true,
			autoHeaderHeight: true,
		}),
		[],
	);

	const stageResultsHeight = rowData.length * 51.3;
	const _coefficientsHeight = coefficientData.length * 51.3;

	const theme =
		mode === "light" || mode === undefined
			? agGridCustomMUITheme
			: agGridCustomMUIThemeDark;

	const icons = useMemo<{
		[key: string]: ((...args: any[]) => any) | string;
	}>(() => {
		return agGridIconSet;
	}, []);

	const getRowHeight = useCallback(
		(params: RowHeightParams): number | undefined | null => {
			return params.data.rowHeight;
		},
		[],
	);

	return (
		<>
			<TableWrapper
				minHeight={stageResultsHeight}
				maxHeight={stageResultsHeight}
				data-test-id="calculation-result-table-preview--div-0"
			>
				<AgGridReact
					rowData={rowData}
					columnDefs={columnDefs}
					defaultColDef={defaultColDef}
					icons={icons}
					localeText={AG_GRID_LOCALE_RU}
					getRowHeight={getRowHeight}
					getRowStyle={(
						params,
					): Record<string, string | number> | undefined => {
						if (params.data?.disabled) {
							return {
								opacity: 0.4,
								pointerEvents: "none",
								filter: "grayscale(1)",
								cursor: "not-allowed",
							};
						}
						return {};
					}}
					theme={theme}
					data-test-id="calculation-result-table-preview--AgGridReact-0"
				/>
			</TableWrapper>
			<Spacer />
		</>
	);
};

const TableWrapper = styled("div")<{ minHeight: number; maxHeight: number }>`
	min-height: ${(props) => props.minHeight}px;
	height: 100%;
	max-height: ${(props) => props.maxHeight}px;
	width: 100%;
	padding: 0 20px 0 0;
`;
