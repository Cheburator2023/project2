import { styled, useColorScheme } from "@mui/material";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAnketaCRUDFormsStore } from "@react-client/features/v1/anketaCRUD/stores/useAnketaCRUDFormsStore";
import {
	assessmentCalculationsStore,
	StageValues,
} from "@react-client/features/v1/anketaCRUD/stores/assessmentCalculationsStore";
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
} from "../../../../theme/ag-grid/agGridCustomTheme";
import { agGridIconSet } from "../../../../theme/ag-grid/agGridIconSet";
import { AG_GRID_LOCALE_RU } from "../../../../common/tableStuff/agGridLocale.ru";
import { coefficientDisplayNames } from "@react-client/features/v1/anketaCRUD/constants/coefficientMappings";

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

const processStageResults = (
	stageResults: StageValues,
	stageBaseValues: StageValues,
): EpicData[] => {
	// Convert store data to array format
	const stageEntries = Object.entries(stageResults).map(([key, score]) => {
		const stageBaseValue = stageBaseValues[key as keyof StageValues];

		const disabled = score === 0;

		return {
			stageName: stageDisplayNames[key] || key,
			score: score,
			disabled,
			stageBaseValue,
			percentFromAverage: (score / stageBaseValue) * 100,
			offset: ((score - stageBaseValue) / stageBaseValue) * 100,
		};
	});

	if (stageEntries.length === 0) return [];

	const totalScore = stageEntries.reduce((sum, item) => sum + item.score, 0);
	const totalScoreBase = Object.entries(stageBaseValues).reduce(
		(sum, [, value]) => sum + value,
		0,
	);

	const totalRow: EpicData = {
		stageName: "Итоговая оценка",
		score: totalScore,
		stageBaseValue: totalScoreBase,
		rowHeight: 60,
		offset: ((totalScore - totalScoreBase) / totalScoreBase) * 100,
	};

	return [totalRow, ...stageEntries];
};

const processCoefficients = (
	coefficients: Record<string, number>,
): CoefficientData[] => {
	return Object.entries(coefficients).map(([key, value]) => ({
		coefficientName: coefficientDisplayNames[key] || key,
		value: value,
	}));
};

export const CalculationResultTable = () => {
	const { stageResults, coefficients, stageBaseValues } =
		assessmentCalculationsStore();

	const { setCalculationResult } = useAnketaCRUDFormsStore();
	const { mode } = useColorScheme();

	const rowData = useMemo<EpicData[]>(() => {
		return processStageResults(stageResults, stageBaseValues);
	}, [stageResults]);

	const coefficientData = useMemo<CoefficientData[]>(() => {
		return processCoefficients(coefficients);
	}, [coefficients]);

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
			// cellRenderer: TotalScoreChipRenderer,
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
		// {
		// 	headerName: "Разница в % относительно базовой оценкой по стриму (Сфера)",
		// 	field: "percentFromAverage",
		// 	flex: 1,
		// 	cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
		// 		const style: CellStyle = {};

		// 		if (params.data?.stageName === "Итоговая оценка") {
		// 			style.fontWeight = "bold";
		// 			style.fontSize = "1.1em";
		// 		}

		// 		if (params.value != null) {
		// 			if (params.value > 100) {
		// 				style.color = "red";
		// 			} else if (params.value < 100) {
		// 				style.color = "green";
		// 			}
		// 		}

		// 		if (params.data?.disabled) {
		// 			style.opacity = 0.5;
		// 			style.pointerEvents = "none";
		// 		}

		// 		return style;
		// 	},
		// 	valueFormatter: (params: ValueFormatterParams<EpicData>): string => {
		// 		return typeof params.value === "number"
		// 			? `${params.value.toFixed(1)}%`
		// 			: "";
		// 	},
		// },
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

	useDeepEffect(() => {
		setCalculationResult(rowData.map(({ rowHeight, ...rest }) => rest));
	}, [rowData]);

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
				data-test-id="calculation-result-table--div-0"
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
					data-test-id="calculation-result-table--AgGridReact-0"
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
