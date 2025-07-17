import schema from "@react-client/schemas/calc_schema.json";
import { ColDef } from "ag-grid-community";

export const questionnaire: ColDef<any, any>[] = [
	{
		field: "questionnaireData.modelsCount",
		headerName: "Количество моделей",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.autoMlRequired",
		headerName: "Необходимость AutoML",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.dataSourcesCount",
		headerName: "Количество источников для проработки",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.readyPromReports",
		headerName: "Наличие готовых пром витрин",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.pilotModelRequired",
		headerName: "Необходимость реализации пилотной модели",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.pilotSupportRequired",
		headerName: "Необходимость поддержки проведения пилота",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.assessedInitiativesCount",
		headerName: "Количество оцениваемых инициатив",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.productionAdditionalReports",
		headerName:
			"Необходимость продуктивизации и количество дополнительных витрин",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.generalUncertainty",
		headerName: "Общая неопределенность",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const UNCERTAINTY_TYPE_VALUES =
				schema.properties.generalUncertainty.items.properties.type.enum;
			const UNCERTAINTY_TYPE_VALUE_NAMES =
				schema.properties.generalUncertainty.items.properties.type.enumNames;

			const generalUncertaintyObj =
				params.data.questionnaireData?.generalUncertainty || {};

			const final_pretty_string = Object.keys(generalUncertaintyObj)
				.map((key) => {
					const index = UNCERTAINTY_TYPE_VALUES.indexOf(key);

					if (index !== -1) {
						const prettyName = UNCERTAINTY_TYPE_VALUE_NAMES[index];
						const rawValue = generalUncertaintyObj[key];

						let formattedValue: string;

						if (typeof rawValue === "object" && rawValue !== null) {
							formattedValue = Object.values(rawValue).join(", ");
						} else {
							formattedValue = rawValue;
						}

						return `${prettyName}: ${formattedValue}`;
					}

					return null;
				})
				.filter((item) => item !== null)
				.join(", ");

			return final_pretty_string;
		},
	},
	{
		field: "questionnaireData.algorithmComplexity",
		headerName: "Сложность алгоритма / тип ML задачи",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const colId = params.column.getColId();
			const channels = params.data.questionnaireData?.[colId] || [];
			return channels
				.map((ch: any, index: any) => `${index + 1}. ${ch.algorithmType}`)
				.join(", ");
		},
	},
	{
		field: "questionnaireData.setupComplexity",
		headerName: "Сложность постановки",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.initiativeTimeline",
		headerName: "Сроки инициативы",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.initiativeCost",
		headerName: "Стоимость инициативы",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.uncertaintyAdjustment",
		headerName: "Поправка на общую неопределенность",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmType.0.keyName",
		headerName: "Тип алгоритма: Табличные данные",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Табличные данные",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.1.keyName",
		headerName: "Тип алгоритма: Текстовая аналитика_Классические модели",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) =>
					alg.algorithmType === "Текстовая аналитика_Классические модели",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.2.keyName",
		headerName: "Тип алгоритма: Текстовая аналитика_LLM",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Текстовая аналитика_LLM",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.3.keyName",
		headerName: "Тип алгоритма: Аудио аналитика",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Аудио Аналитика",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.4.keyName",
		headerName: "Тип алгоритма: Компьютерное зрение_CV",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Компьютерное зрение_CV",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.5.keyName",
		headerName: "Тип алгоритма: Оптимизационная задача",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Оптимизационная задача",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.6.keyName",
		headerName: "Тип алгоритма: Гео-аналитика",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Гео-аналитика",
			);
		},
	},
	{
		field: "questionnaireData.algorithmType.7.keyName",
		headerName: "Тип алгоритма: Графовая аналитика",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const algorithms =
				params.data.questionnaireData?.algorithmComplexity || [];
			return algorithms.some(
				(alg: any) => alg.algorithmType === "Графовая аналитика",
			);
		},
	},
	{
		field: "questionnaireData.productionDeploymentChannels",
		headerName: "Необходимость продуктивизации и каналы внедрения моделей",
		sortable: true,
		filter: true,
		valueGetter: (params: any) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];

			return channels.join(", ");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.0.keyName",
		headerName: "Канал внедрения: Батч",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Батч");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.1.keyName",
		headerName: "Канал внедрения: Батч + загрузка данных потребителю",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Батч+загрузка данных потребителю");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.2.keyName",
		headerName: "Канал внедрения: Батч + Онлайн",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Батч + Онлайн");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.3.keyName",
		headerName: "Канал внедрения: Онлайн",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Онлайн");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.4.keyName",
		headerName: "Канал внедрения: Онлайн gpu",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Онлайн gpu");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.5.keyName",
		headerName: "Канал внедрения: Стриминг",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Стриминг");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.6.keyName",
		headerName: "Канал внедрения: Мобильные устройства",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Мобильные устройства");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.7.keyName",
		headerName: "Канал внедрения: LLM",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("LLM");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.8.keyName",
		headerName: "Канал внедрения: Гео-сервисы",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Гео-сервисы");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.9.keyName",
		headerName: "Канал внедрения: Внедрение в облаке",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Внедрение в облаке");
		},
	},
	{
		field: "questionnaireData.deploymentChannel.10.keyName",
		headerName: "Канал внедрения: Графовая платформа",
		sortable: true,
		filter: true,
		cellDataType: "boolean",
		valueGetter: (params) => {
			const channels =
				params.data.questionnaireData?.productionDeploymentChannels || [];
			return channels.includes("Графовая платформа");
		},
	},
	{
		field: "questionnaireData.generalUncertainty.businessProcessComplexity",
		headerName:
			"Риск: Изменение, недостаточная проработка или сложности бизнес-процессов Банка",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "businessProcessComplexity",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.projectSolutionDefects",
		headerName:
			"Риск: Наличие дефектов во внедряемом решении/ПО в рамках проекта",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "projectSolutionDefects",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.adjacentProjectsImpact",
		headerName:
			"Риск: Негативное влияние смежных проектов на показатели проекта",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "adjacentProjectsImpact",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.planningRequirementGaps",
		headerName:
			"Риск: Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "planningRequirementGaps",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.contractorPerformanceIssues",
		headerName:
			"Риск: Недобросовестное исполнение услуг со стороны привлеченных контрагентов/подрядчиков",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "contractorPerformanceIssues",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.qualifiedStaffShortage",
		headerName:
			"Риск: Отсутствие квалифицированного персонала или ошибок персонала",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "qualifiedStaffShortage",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.sanctionsRisk",
		headerName: "Риск: Введение санкционных мер и других ограничений",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "sanctionsRisk",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.controlProceduresGaps",
		headerName: "Риск: Недостаток или отсутствие контрольных процедур",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "controlProceduresGaps",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.regulatoryChanges",
		headerName: "Риск: Изменение регуляторных требований",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "regulatoryChanges",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.systemUnderutilization",
		headerName: "Риск: Неиспользование ИС после завершения проекта",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "systemUnderutilization",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
	{
		field: "questionnaireData.itArchitectureChanges",
		headerName: "Риск: Изменение целевой ИТ архитектуры Банка",
		sortable: true,
		filter: true,
		valueGetter: (params) => {
			const uncertainties =
				params.data.questionnaireData?.generalUncertainty || [];
			const risk = uncertainties.find(
				(item: any) => item.type === "itArchitectureChanges",
			);
			return risk
				? `Вероятность: ${risk.probability}, Влияние: ${risk.influence}`
				: "-";
		},
	},
];
