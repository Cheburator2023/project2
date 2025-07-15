import { ColDef, ValueGetterFunc } from "ag-grid-community";

const valueGetter = (
	key: string,
	parent: string,
): ValueGetterFunc<any, any> => {
	return (params) => {
		const field = params.colDef.field;
		const regex = new RegExp(`${parent}\\.(\\d+)\\.`);
		const index = field?.match(regex)?.[1];
		return params.data?.[parent]?.[index || 0]?.[key] ?? "-";
	};
};

export const calculationResult: ColDef<any, any>[] = [
	{
		headerName: "Итоговая оценка",
		field: `calculationResult.0.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "% Отклонение итоговой оценки от средней",
		field: `calculationResult.0.stageName`,
		valueGetter: valueGetter("offset", "calculationResult"),
	},
	{
		headerName: "01. Постановка задачи",
		field: `calculationResult.1.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "02. Поиск данных",
		field: `calculationResult.2.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "04. Построение витрины для разработки",
		field: `calculationResult.3.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "05A. Разработка пилотной модели (MVP)",
		field: `calculationResult.4.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "05. Разработка модели",
		field: `calculationResult.5.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "AML Разработка",
		field: `calculationResult.6.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "05B. Пилотирование модели",
		field: `calculationResult.7.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "07. Разработка витрины для применения модели",
		field: `calculationResult.8.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "09. Адаптация и внедрение модели",
		field: `calculationResult.9.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "AML Внедрение",
		field: `calculationResult.10.stageName`,
		valueGetter: valueGetter("score", "calculationResult"),
	},
];
