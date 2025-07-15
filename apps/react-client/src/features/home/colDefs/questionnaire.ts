import schema from "@react-client/features/jsonFormGenerator/schemas/calc_schema.json";
import { ColDef } from "ag-grid-community";

export const questionnaire: ColDef<any, any>[] = [
	{
		field: "questionnaireData.name",
		headerName: "Название анкеты",
		sortable: true,
		filter: true,
	},
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
		field: "questionnaireData.productionDeploymentChannels",
		headerName: "Необходимость продуктивизации и каналы внедрения моделей",
		sortable: true,
		filter: true,
		valueGetter: (params: any) => {
			const colId = params.column.getColId();

			const channels = params.data.questionnaireData?.[colId] || [];
			return channels
				.map((ch: any, index: any) => `${index + 1}. ${ch.deploymentChannel}`)
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
		field: "questionnaireData.algorithmTabular",
		headerName: "Тип алгоритма: Табличные данные",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmTextClassic",
		headerName: "Тип алгоритма: Текстовая аналитика_Классические модели",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmTextLLM",
		headerName: "Тип алгоритма: Текстовая аналитика_LLM",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmAudio",
		headerName: "Тип алгоритма: Аудио аналитика",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmComputerVision",
		headerName: "Тип алгоритма: Компьютерное зрение_CV",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmOptimization",
		headerName: "Тип алгоритма: Оптимизационная задача",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmGeoAnalytics",
		headerName: "Тип алгоритма: Гео-аналитика",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.algorithmGraphAnalytics",
		headerName: "Тип алгоритма: Графовая аналитика",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentBatch",
		headerName: "Канал внедрения: Батч",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentBatchWithData",
		headerName: "Канал внедрения: Батч + загрузка данных потребителю",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentBatchOnline",
		headerName: "Канал внедрения: Батч + Онлайн",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentOnline",
		headerName: "Канал внедрения: Онлайн",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentOnlineGpu",
		headerName: "Канал внедрения: Онлайн gpu",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentStreaming",
		headerName: "Канал внедрения: Стриминг",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentMobile",
		headerName: "Канал внедрения: Мобильные устройства",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentLLM",
		headerName: "Канал внедрения: LLM",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentGeoServices",
		headerName: "Канал внедрения: Гео-сервисы",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentCloud",
		headerName: "Канал внедрения: Внедрение в облаке",
		sortable: true,
		filter: true,
	},
	{
		field: "questionnaireData.deploymentGraphPlatform",
		headerName: "Канал внедрения: Графовая платформа",
		sortable: true,
		filter: true,
	},
];
