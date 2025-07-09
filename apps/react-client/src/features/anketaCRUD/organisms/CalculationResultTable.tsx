import { styled, Typography, useColorScheme } from "@mui/material";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import {
	assessmentCalculationsStore,
	StageValues,
} from "@react-client/features/jsonFormGenerator/hooks/assessmentCalculationsStore";
import {
	type CellClassParams,
	type CellStyle,
	type ColDef,
	colorSchemeDarkBlue,
	themeQuartz,
	type ValueFormatterParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

const themeQuartzDark = themeQuartz.withPart(colorSchemeDarkBlue);

interface EpicData {
	stageName: string;
	score: number;
	percentFromAverage?: number;
	offset?: number;
	stageBaseValue?: number;
	disabled?: boolean;
}

interface CoefficientData {
	coefficientName: string;
	value: number;
}

const stageDisplayNames: Record<string, string> = {
	stage01: "01. Постановка задачи",
	stage02: "02. Поиск данных",
	stage04: "04. Построение витрины для разработки",
	stage05A: "05A. Разработка MVP",
	stage05: "05. Разработка модели",
	amlDrafting: "AML разработка",
	stage05B: "05B. Пилотирование модели",
	stage07: "06. Разработка витрины для применения модели",
	stage09: "07. Адаптация и внедрение",
	amlEnforcement: "AML внедрение",
};

const coefficientDisplayNames: Record<string, string> = {
	modelsCountCoefficient: "Количество моделей",
	setupComplexityCoefficient: "Сложности постановки",
	generalUncertaintyCoefficient: "Общая неопределенность",
	readyPromReportsCoefficient: "Наличие готовых пром витрин",
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

const processStageResults = (
	stageResults: StageValues,
	stageBaseValues: StageValues,
): EpicData[] => {
	// Convert store data to array format
	const stageEntries = Object.entries(stageResults).map(([key, score]) => {
		const stageBaseValue = stageBaseValues[key as keyof StageValues];

		return {
			stageName: stageDisplayNames[key] || key,
			score: score,
			disabled: score === 0,
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

export const CalculationResultTable = ({
	isCreate,
}: {
	isCreate?: boolean;
}) => {
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
					style.fontSize = "1.1em";
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
		},
		{
			headerName: "Оценка с поправкой на коэффициент сложности",
			field: "score",
			flex: 1,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.stageName === "Итоговая оценка") {
					style.fontWeight = "bold";
					style.fontSize = "1.1em";
				}

				if (params.data?.disabled) {
					style.opacity = 0.5;
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
					style.fontWeight = "bold";
					style.fontSize = "1.1em";
				}

				if (params.value != null) {
					if (params.value > 0) {
						style.color = "red";
					} else if (params.value < 0) {
						style.color = "green";
					}
				}

				if (params.data?.disabled) {
					style.opacity = 0.5;
					style.pointerEvents = "none";
				}

				return style;
			},
		},
	]);

	const [coefficientColumnDefs] = useState<ColDef<CoefficientData>[]>([
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
		}),
		[],
	);

	const defaultCoefficientColDef = useMemo<ColDef<CoefficientData>>(
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
	const coefficientsHeight = coefficientData.length * 51.3;

	useDeepEffect(() => {
		setCalculationResult(rowData);
	}, [rowData]);

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
					theme={
						mode === "light" || mode === undefined
							? themeQuartz
							: themeQuartzDark
					}
					data-test-id="calculation-result-table--AgGridReact-0"
				/>
			</TableWrapper>
			<Spacer />
			<Typography variant="h6">Промежуточные коэффициенты</Typography>
			<Spacer />
			<TableWrapper
				minHeight={coefficientsHeight}
				maxHeight={coefficientsHeight}
				data-test-id="coefficients-table--div-0"
			>
				<AgGridReact
					rowData={coefficientData}
					columnDefs={coefficientColumnDefs}
					defaultColDef={defaultCoefficientColDef}
					theme={
						mode === "light" || mode === undefined
							? themeQuartz
							: themeQuartzDark
					}
					data-test-id="coefficients-table--AgGridReact-0"
				/>
			</TableWrapper>
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
