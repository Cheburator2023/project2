import { AgGridReact } from "ag-grid-react";
import React, { useState, useMemo } from "react";

import {
	CellClassParams,
	CellStyle,
	ColDef,
	ValueFormatterParams,
} from "ag-grid-community";

interface RawEpicData {
	epicName: string;
	score: number;
}

interface EpicData extends RawEpicData {
	percentFromAverage: number;
}

const initialEpicData: RawEpicData[] = [
	{ epicName: "Разработка нового модуля", score: 8 },
	{ epicName: "Оптимизация базы данных", score: 10 },
	{ epicName: "Рефакторинг легаси кода", score: 6 },
	{ epicName: "Исправление критических багов", score: 9 },
	{ epicName: "Обновление UI-кита", score: 7 },
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

export const CalculationResultTable: React.FC = () => {
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

	return (
		<div style={{ height: "100%", width: "100%" }}>
			<AgGridReact<EpicData>
				rowData={rowData}
				columnDefs={columnDefs}
				defaultColDef={defaultColDef}
			/>
		</div>
	);
};
