import { ColDef, ValueGetterFunc } from "ag-grid-community";

const valueGetter = (
	key: string,
	parent: string,
): ValueGetterFunc<any, any> => {
	return (params) => {
		const field = params.colDef.field;
		const regex = new RegExp(`${parent}\\.(\\d+)\\.`);
		const index = field?.match(regex)?.[1];
		return params.data?.questionnaireData?.[parent]?.[index || 0]?.[key] ?? "-";
	};
};

export const calculationResult: ColDef<any, any>[] = [
	{
		headerName: "Итоговая оценка",
		field: `questionnaireData.calculationResult.0.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "% Отклонение итоговой оценки от средней",
		field: `questionnaireData.calculationResult.0.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("offset", "calculationResult"),
	},
	{
		headerName: "01. Постановка задачи",
		field: `questionnaireData.calculationResult.1.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "02. Поиск данных",
		field: `questionnaireData.calculationResult.2.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "04. Построение витрины для разработки",
		field: `questionnaireData.calculationResult.3.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "05A. Разработка пилотной модели (MVP)",
		field: `questionnaireData.calculationResult.4.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "05. Разработка модели",
		field: `questionnaireData.calculationResult.5.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "AML Разработка",
		field: `questionnaireData.calculationResult.6.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "05B. Пилотирование модели",
		field: `questionnaireData.calculationResult.7.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "07. Разработка витрины для применения модели",
		field: `questionnaireData.calculationResult.8.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "09. Адаптация и внедрение модели",
		field: `questionnaireData.calculationResult.9.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
	{
		headerName: "AML Внедрение",
		field: `questionnaireData.calculationResult.10.stageName`,
		cellDataType: "number",
		valueGetter: valueGetter("score", "calculationResult"),
	},
];
