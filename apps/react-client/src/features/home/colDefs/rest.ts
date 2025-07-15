import { ColDef } from "ag-grid-community";

export const rest: ColDef<any, any>[] = [
	{
		field: "riskBusinessProcesses",
		headerName:
			"Риск: Изменение, недостаточная проработка или сложности бизнес-процессов Банка",
		sortable: true,
		filter: true,
	},
	{
		field: "riskSoftwareDefects",
		headerName:
			"Риск: Наличие дефектов во внедряемом решении/ПО в рамках проекта",
		sortable: true,
		filter: true,
	},
	{
		field: "riskRelatedProjects",
		headerName:
			"Риск: Негативное влияние смежных проектов на показатели проекта",
		sortable: true,
		filter: true,
	},
	{
		field: "riskIncreasedEffort",
		headerName:
			"Риск: Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
		sortable: true,
		filter: true,
	},
	{
		field: "riskContractorPerformance",
		headerName:
			"Риск: Недобросовестное исполнение услуг со стороны привлеченных контрагентов/подрядчиков",
		sortable: true,
		filter: true,
	},
	{
		field: "riskPersonnelQuality",
		headerName:
			"Риск: Отсутствие квалифицированного персонала или ошибок персонала",
		sortable: true,
		filter: true,
	},
	{
		field: "riskSanctions",
		headerName: "Риск: Введение санкционных мер и других ограничений",
		sortable: true,
		filter: true,
	},
	{
		field: "riskControlProcedures",
		headerName: "Риск: Недостаток или отсутствие контрольных процедур",
		sortable: true,
		filter: true,
	},
	{
		field: "riskRegulatoryChanges",
		headerName: "Риск: Изменение регуляторных требований",
		sortable: true,
		filter: true,
	},
	{
		field: "riskSystemNonUsage",
		headerName: "Риск: Неиспользование ИС после завершения проекта",
		sortable: true,
		filter: true,
	},
	{
		field: "riskArchitectureChanges",
		headerName: "Риск: Изменение целевой ИТ архитектуры Банка",
		sortable: true,
		filter: true,
	},
];
