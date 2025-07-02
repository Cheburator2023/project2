import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import { Typography, styled, useColorScheme } from "@mui/material";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { useAnketaCRUDFormsStore } from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { assessmentCalculationsStore } from "@react-client/features/jsonFormGenerator/hooks/assessmentCalculationsStore";
import {
	type CellClassParams,
	type CellStyle,
	type ColDef,
	type ValueFormatterParams,
	colorSchemeDarkBlue,
	themeQuartz,
} from "ag-grid-community";

const themeQuartzDark = themeQuartz.withPart(colorSchemeDarkBlue);

interface EpicData {
	epicName: string;
	score: number;
	percentFromAverage: number;
	offset: number;
}

interface CoefficientData {
	coefficientName: string;
	value: number;
}

const stageDisplayNames: Record<string, string> = {
	stage01: "01. Постановка задачи",
	stage02: "02. Поиск данных",
	stage03: "03. Построение витрины данных",
	stage05A: "04. Разработка MVP",
	stage05: "05А. Разработка модели",
	amlDrafting: "AML разработка",
	stage05B: "05B. Пилотирование модели",
	stage07: "06. Разработка витрины для применения модели",
	stage09: "07. Адаптация и внедрение",
	amlEnforcement: "AML внедрение",
};

const coefficientDisplayNames: Record<string, string> = {
	modelsCountCoefficient: "Коэффициент количества моделей",
	setupComplexityCoefficient: "Коэффициент сложности настройки",
	generalUncertaintyCoefficient: "Коэффициент общей неопределенности",
	readyPromReportsCoefficient: "Коэффициент готовых отчетов",
	dataSourcesCountCoefficient: "Коэффициент количества источников данных",
	pilotModelRequired: "Требуется пилотная модель",
	algorithmComplexityCoefficient: "Коэффициент сложности алгоритма",
	pilotSupportRequired: "Требуется поддержка пилота",
	autoMlRequired: "Требуется AutoML",
	productionAdditionalReportsCoefficient: "Коэффициент дополнительных отчетов",
	deploymentChannelsCoefficient: "Коэффициент каналов развертывания",
};

const processStageResults = (
	stageResults: Record<string, number>,
): EpicData[] => {
	// Convert store data to array format
	const stageEntries = Object.entries(stageResults).map(([key, score]) => ({
		epicName: stageDisplayNames[key] || key,
		score: score,
	}));

	if (stageEntries.length === 0) return [];

	const totalScore = stageEntries.reduce((sum, item) => sum + item.score, 0);
	const averageScore = totalScore / stageEntries.length;

	const detailedData: EpicData[] = stageEntries.map((item) => ({
		...item,
		offset: ((item.score - averageScore) / averageScore) * 100,
		percentFromAverage: (item.score / averageScore) * 100,
	}));

	const totalOffset = ((totalScore - averageScore) / averageScore) * 100;
	const totalPercentFromAverage = (totalScore / averageScore) * 100;

	const totalRow: EpicData = {
		epicName: "Итоговая оценка",
		score: totalScore,
		percentFromAverage: totalPercentFromAverage,
		offset: totalOffset,
	};

	const averageRow: EpicData = {
		epicName: "Cреднее значение",
		score: averageScore,
		percentFromAverage: 0,
		offset: 0,
	};

	return [totalRow, averageRow, ...detailedData];
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
}: { isCreate?: boolean }) => {
	const { stageResults, coefficients } = assessmentCalculationsStore();

	const { setCalculationResult } = useAnketaCRUDFormsStore();
	const { mode } = useColorScheme();

	const rowData = useMemo<EpicData[]>(() => {
		return processStageResults(stageResults);
	}, [stageResults]);

	const coefficientData = useMemo<CoefficientData[]>(() => {
		return processCoefficients(coefficients);
	}, [coefficients]);

	const [columnDefs] = useState<ColDef<EpicData>[]>([
		{
			headerName: "Эпик",
			field: "epicName",
			flex: 2,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle | null => {
				if (params.data?.epicName === "Итоговая оценка") {
					return { fontWeight: "bold", fontSize: "1.1em" };
				}
				return null;
			},
		},
		{
			headerName: "Оценка",
			field: "score",
			flex: 1,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle | null => {
				if (params.data?.epicName === "Итоговая оценка") {
					return { fontWeight: "bold", fontSize: "1.1em" };
				}
				return null;
			},
			valueFormatter: (params: ValueFormatterParams<EpicData>): string => {
				return typeof params.value === "number" ? params.value.toFixed(1) : "";
			},
		},
		{
			headerName: "Отклонение от среднего значения",
			field: "offset",
			flex: 1,
			valueFormatter: (params: ValueFormatterParams<EpicData>): string => {
				return typeof params.value === "number"
					? `${params.value.toFixed(1)}%`
					: "";
			},
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.epicName === "Итоговая оценка") {
					style.fontWeight = "bold";
					style.fontSize = "1.1em";
				}

				if (params.value != null) {
					if (params.value > 0) {
						style.color = "green";
					} else if (params.value < 0) {
						style.color = "red";
					}
				}

				return style;
			},
		},
		{
			headerName: "% от среднего значения",
			field: "percentFromAverage",
			flex: 1,
			cellStyle: (params: CellClassParams<EpicData>): CellStyle => {
				const style: CellStyle = {};

				if (params.data?.epicName === "Итоговая оценка") {
					style.fontWeight = "bold";
					style.fontSize = "1.1em";
				}

				if (params.value != null) {
					if (params.value > 0) {
						style.color = "green";
					} else if (params.value < 0) {
						style.color = "red";
					}
				}

				return style;
			},
			valueFormatter: (params: ValueFormatterParams<EpicData>): string => {
				return typeof params.value === "number"
					? `${params.value.toFixed(1)}%`
					: "";
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
				return typeof params.value === "number" ? params.value.toFixed(3) : "";
			},
		},
	]);

	const defaultColDef = useMemo<ColDef<EpicData>>(
		() => ({
			resizable: true,
			sortable: true,
			editable: false,
		}),
		[],
	);

	const defaultCoefficientColDef = useMemo<ColDef<CoefficientData>>(
		() => ({
			resizable: true,
			sortable: true,
			editable: false,
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
