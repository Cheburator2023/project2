import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import { useColorScheme } from "@mui/material";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
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
}

// Mapping from store properties to display names
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
		percentFromAverage: ((item.score - averageScore) / averageScore) * 100,
	}));

	const totalRow: EpicData = {
		epicName: "Итоговая оценка",
		score: averageScore,
		percentFromAverage: 0,
	};

	return [totalRow, ...detailedData];
};

export const CalculationResultTable = ({
	isCreate,
}: { isCreate?: boolean }) => {
	const { stageResults } = assessmentCalculationsStore();
	const { setCalculationResult } = useAnketaCRUDFormsStore();

	// Process data from the store
	const rowData = useMemo<EpicData[]>(() => {
		return processStageResults(stageResults);
	}, [stageResults]);

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

	const defaultColDef = useMemo<ColDef<EpicData>>(
		() => ({
			resizable: true,
			sortable: true,
			editable: false,
		}),
		[],
	);

	const { mode } = useColorScheme();

	// Calculate height based on actual data length
	const height = useMemo(() => {
		return rowData.length * 51.3;
	}, [rowData.length]);

	useDeepEffect(() => {
		setCalculationResult(rowData);
	}, [rowData]);

	return (
		<div
			style={{
				minHeight: height,
				height: "100%",
				maxHeight: height,
				width: "100%",
			}}
			data-test-id="calculation-result-table--div-0"
		>
			<AgGridReact
				rowData={rowData}
				columnDefs={columnDefs}
				defaultColDef={defaultColDef}
				theme={
					mode === "light" || mode === undefined ? themeQuartz : themeQuartzDark
				}
				data-test-id="calculation-result-table--AgGridReact-0"
			/>
		</div>
	);
};
