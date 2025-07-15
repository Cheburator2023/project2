import { ColDef, ValueGetterFunc } from "ag-grid-community";

const scoreValueGetter: ValueGetterFunc<any, any> = (params) => {
	const field = params.colDef.field;
	const index = field?.match(/calculationResult\.(\d+)\./)?.[1];
	return params.data?.calculationResult?.[index || 0]?.score ?? "-";
};

const offsetValueGetter: ValueGetterFunc<any, any> = (params) => {
	const field = params.colDef.field;
	const index = field?.match(/calculationResult\.(\d+)\./)?.[1];
	return params.data?.calculationResult?.[index || 0]?.offset ?? "-";
};

export const calculationResult: ColDef<any, any>[] = [
	{
		headerName: "Итоговая оценка",
		field: `calculationResult.0.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "% Отклонение итоговой оценки от средней",
		field: `calculationResult.0.stageName`,
		valueGetter: offsetValueGetter,
	},
	{
		headerName: "01. Постановка задачи",
		field: `calculationResult.1.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "02. Поиск данных",
		field: `calculationResult.2.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "04. Построение витрины для разработки",
		field: `calculationResult.3.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "05A. Разработка пилотной модели (MVP)",
		field: `calculationResult.4.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "05. Разработка модели",
		field: `calculationResult.5.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "AML Разработка",
		field: `calculationResult.6.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "05B. Пилотирование модели",
		field: `calculationResult.7.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "07. Разработка витрины для применения модели",
		field: `calculationResult.8.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "09. Адаптация и внедрение модели",
		field: `calculationResult.9.stageName`,
		valueGetter: scoreValueGetter,
	},
	{
		headerName: "AML Внедрение",
		field: `calculationResult.10.stageName`,
		valueGetter: scoreValueGetter,
	},
];
