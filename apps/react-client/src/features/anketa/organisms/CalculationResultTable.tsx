import { AgGridReact } from "ag-grid-react";
import { useMemo, useState } from "react";

import { useColorScheme } from "@mui/material";
import {
	type CellClassParams,
	type CellStyle,
	type ColDef,
	type ValueFormatterParams,
	colorSchemeDarkBlue,
	themeQuartz,
} from "ag-grid-community";

const themeQuartzDark = themeQuartz.withPart(colorSchemeDarkBlue);

interface RawEpicData {
	epicName: string;
	score: number;
}

interface EpicData extends RawEpicData {
	percentFromAverage: number;
}

const initialEpicData: RawEpicData[] = [
	{ epicName: "01. Постановка задачи", score: 8 },
	{ epicName: "02. Поиск данных", score: 10 },
	{ epicName: "03. Построение витрины данных", score: 6 },
	{ epicName: "04. Разработка MVP", score: 9 },
	{ epicName: "05А. Разработка модели", score: 7 },
	{ epicName: "06. Разработка прототипа", score: 100 },
	{ epicName: "AML разработка", score: 100 },
	{ epicName: "05B. Пилотирование модели", score: 100 },
	{ epicName: "06. Разработка витрины для применения модели", score: 200 },
	{ epicName: "07. Адаптация и внедрение", score: 200 },
];

const processData = (data: RawEpicData[]): EpicData[] => {
	if (data.length === 0) return [];

	const totalScore = data.reduce((sum, item) => sum + item.score, 0);
	const averageScore = totalScore / data.length;

	const detailedData: EpicData[] = data.map((item) => ({
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
	const [rowData] = useState<EpicData[]>(processData(initialEpicData));

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

	return (
		<div style={{ minHeight: "520px", height: "100%", width: "100%" }}>
			<AgGridReact<EpicData>
				rowData={rowData}
				columnDefs={columnDefs}
				theme={
					mode === "light" || mode === undefined ? themeQuartz : themeQuartzDark
				}
			/>
		</div>
	);
};
