import { ColDef } from "ag-grid-community";
import { format } from "date-fns/esm";

export const meta: ColDef<any, any>[] = [
	{
		field: "name",
		headerName: "Название анкеты",
		sortable: true,
		filter: true,
	},
	{ field: "id", headerName: "Идентификатор", sortable: true, filter: true },
	{
		field: "rfd",
		headerName: "RFD",
		sortable: true,
		filter: true,
	},
	{
		field: "streamExecutor",
		headerName: "Стрим исполнитель",
		sortable: true,
		filter: true,
	},
	{
		field: "department",
		headerName: "Департамент Заказчика",
		sortable: true,
		filter: true,
		valueFormatter: (params: any) => {
			return params?.value ? params?.value?.join(", ") : "-";
		},
	},
	{
		field: "customerName",
		headerName: "Фио заказчика",
		sortable: true,
		filter: true,
	},
	{
		field: "comment",
		headerName: "Комментарий",
		sortable: true,
		filter: true,
	},
	{
		field: "relatedModels",
		headerName: "Связанные модели",
		sortable: true,
		filter: true,
	},
	{
		field: "createdAt",
		headerName: "Дата создания",
		sortable: true,
		filter: "agDateColumnFilter",
		cellDataType: "dateTime",
		valueFormatter: (params) => {
			const dt = new Date(params?.value?.replace("Z", ""));

			return format(dt, "dd MMMM yyyy, HH:mm:ss, xxxxx");
		},
	},
	{
		field: "status",
		headerName: "Статус анкеты",
		sortable: true,
		filter: true,
	},
	{
		field: "parentCalc",
		headerName: "Родительская анкета",
		sortable: true,
		filter: true,
	},
	{
		field: "author",
		headerName: "Автор анкеты",
		sortable: true,
		filter: true,
	},
];
