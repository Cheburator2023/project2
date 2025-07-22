import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { Calculation } from "../entities/calculation.entity";

@Injectable()
export class ExcelExportService {
	async generateExcelFile(calculations: Calculation[]): Promise<Buffer> {
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Calculations");

		worksheet.columns = [
			{ header: "Название расчета", key: "calcName", width: 30 },
			{ header: "Идентификатор", key: "id", width: 36 },
			{ header: "RFD", key: "rfd", width: 20 },
			{ header: "Статус расчета", key: "status", width: 20 },
			{ header: "Стрим исполнитель", key: "streamExecutor", width: 25 },
			{ header: "Департамент Заказчика", key: "department", width: 30 },
			{ header: "ФИО заказчика", key: "customerName", width: 25 },
			{ header: "Комментарий", key: "comment", width: 40 },
			{ header: "Связанные модели", key: "relatedModels", width: 25 },
			{ header: "Дата создания", key: "createdAt", width: 20 },
			{ header: "Родительской расчет", key: "parentCalculation", width: 25 },
			{ header: "Итоговая оценка", key: "finalCoefficient", width: 20 },
			{
				header: "% Отклонение итоговой оценки от средней",
				key: "deviationPercent",
				width: 30,
			},
			{ header: "01. Постановка задачи", key: "stage01", width: 20 },
			{ header: "02. Поиск данных", key: "stage02", width: 20 },
			{
				header: "03. Построение витрины для разработки",
				key: "stage03",
				width: 30,
			},
			{
				header: "05А. Разработка пилотной модели (MVP)",
				key: "stage05a",
				width: 35,
			},
			{ header: "05. Разработка модели", key: "stage05", width: 25 },
			{ header: "AML Разработка", key: "amlDevelopment", width: 25 },
			{ header: "05В. Пилотирование модели", key: "stage05b", width: 25 },
			{
				header: "07. Разработка витрины для применения модели",
				key: "stage07",
				width: 35,
			},
			{ header: "09. Адаптация и внедрение модели", key: "stage09", width: 30 },
			{ header: "AML Внедрение", key: "amlImplementation", width: 25 },
			{ header: "Сложность постановки", key: "setupComplexity", width: 30 },
			{ header: "Сроки инициативы", key: "initiativeTimeline", width: 20 },
			{ header: "Стоимость инициативы", key: "initiativeCost", width: 20 },
			{
				header: "Поправка на общую неопределенность",
				key: "uncertaintyAdjustment",
				width: 30,
			},
			{
				header: "Общая неопределенность",
				key: "generalUncertainty",
				width: 30,
			},
			{
				header: "Риск: Изменение бизнес-процессов Банка",
				key: "riskBusinessProcess",
				width: 40,
			},
			{
				header: "Риск: Наличие дефектов во внедряемом решении",
				key: "riskSolutionDefects",
				width: 40,
			},
			{
				header: "Риск: Влияние смежных проектов",
				key: "riskAdjacentProjects",
				width: 40,
			},
			{
				header: "Риск: Увеличение трудозатрат проекта",
				key: "riskPlanningGaps",
				width: 40,
			},
			{
				header: "Риск: Недобросовестное исполнение услуг",
				key: "riskContractorPerformance",
				width: 40,
			},
			{
				header: "Риск: Отсутствие квалифицированного персонала",
				key: "riskStaffShortage",
				width: 40,
			},
			{
				header: "Риск: Введение санкционных мер",
				key: "riskSanctions",
				width: 40,
			},
			{
				header: "Риск: Недостаток контрольных процедур",
				key: "riskControlProcedures",
				width: 40,
			},
			{
				header: "Риск: Изменение регуляторных требований",
				key: "riskRegulatoryChanges",
				width: 40,
			},
			{
				header: "Риск: Неиспользование ИС после завершения проекта",
				key: "riskSystemUnderutilization",
				width: 40,
			},
			{
				header: "Риск: Изменение целевой ИТ архитектуры",
				key: "riskItArchitecture",
				width: 40,
			},
			{
				header: "Наличие готовых пром витрин",
				key: "readyPromReports",
				width: 25,
			},
			{
				header: "Количество оцениваемых инициатив",
				key: "assessedInitiativesCount",
				width: 30,
			},

			{
				header: "Кол-во источников для проработки",
				key: "dataSourcesCount",
				width: 30,
			},
			{
				header: "Необходимость реализации пилотной модели",
				key: "pilotModelRequired",
				width: 35,
			},
			{
				header: "Сложность алгоритма/тип ML задачи",
				key: "algorithmComplexity",
				width: 35,
			},
			{
				header: "Тип алгоритма: Табличные данные",
				key: "algorithmTabular",
				width: 30,
			},
			{
				header: "Тип алгоритма: Текстовая аналитика_Классические модели",
				key: "algorithmTextClassic",
				width: 45,
			},
			{
				header: "Тип алгоритма: Текстовая аналитика_LLM",
				key: "algorithmTextLLM",
				width: 35,
			},
			{
				header: "Тип алгоритма: Аудио аналитика",
				key: "algorithmAudio",
				width: 30,
			},
			{
				header: "Тип алгоритма: Компьютерное зрение_CV",
				key: "algorithmCV",
				width: 35,
			},
			{
				header: "Тип алгоритма: Оптимизационная задача",
				key: "algorithmOptimization",
				width: 35,
			},
			{
				header: "Тип алгоритма: Гео-аналитика",
				key: "algorithmGeo",
				width: 30,
			},
			{
				header: "Тип алгоритма: Графовая аналитика",
				key: "algorithmGraph",
				width: 30,
			},
			{
				header: "Необходимость поддержки проведения пилота",
				key: "pilotSupportRequired",
				width: 40,
			},
			{ header: "Необходимость AutoML", key: "autoMlRequired", width: 25 },
			{
				header:
					"Необходимость продуктивизации и количество дополнительных витрин",
				key: "productionAdditionalReports",
				width: 50,
			},
			{
				header: "Необходимость продуктивизации и каналы внедрения моделей",
				key: "productionDeploymentChannels",
				width: 50,
			},
			{ header: "Канал внедрения: Батч", key: "deploymentBatch", width: 25 },
			{
				header: "Канал внедрения: Батч + загрузка данных потребителю",
				key: "deploymentBatchLoad",
				width: 40,
			},
			{
				header: "Канал внедрения: Батч + Онлайн",
				key: "deploymentBatchOnline",
				width: 30,
			},
			{ header: "Канал внедрения: Онлайн", key: "deploymentOnline", width: 25 },
			{
				header: "Канал внедрения: Онлайн gpu",
				key: "deploymentOnlineGpu",
				width: 30,
			},
			{
				header: "Канал внедрения: Стриминг",
				key: "deploymentStreaming",
				width: 25,
			},
			{
				header: "Канал внедрения: Мобильные устройства",
				key: "deploymentMobile",
				width: 30,
			},
			{ header: "Канал внедрения: LLM", key: "deploymentLLM", width: 25 },
			{
				header: "Канал внедрения: Гео-сервисы",
				key: "deploymentGeoServices",
				width: 30,
			},
			{
				header: "Канал внедрения: Внедрение в облаке",
				key: "deploymentCloud",
				width: 30,
			},
			{
				header: "Канал внедрения: Графовая платформа",
				key: "deploymentGraph",
				width: 30,
			},
		];

		calculations.forEach((calculation) => {
			const row: any = {
				calcName: calculation.calcName,
				id: calculation.id,
				rfd: calculation.rfd,
				streamExecutor: calculation.streamExecutor,
				department: calculation.department?.join(", "),
				customerName: calculation.customerName,
				comment: calculation.comment,
				createdAt: calculation.createdAt,
				finalCoefficient: calculation.finalCoefficient,
				setupComplexity: calculation.questionnaireData?.setupComplexity,
				initiativeTimeline: calculation.questionnaireData?.initiativeTimeline,
				initiativeCost: calculation.questionnaireData?.initiativeCost,
				uncertaintyAdjustment:
					calculation.questionnaireData?.uncertaintyAdjustment,
				readyPromReports: calculation.questionnaireData?.readyPromReports,
				assessedInitiativesCount:
					calculation.questionnaireData?.assessedInitiativesCount,
				dataSourcesCount: calculation.questionnaireData?.dataSourcesCount,
				pilotModelRequired: calculation.questionnaireData?.pilotModelRequired,
				pilotSupportRequired:
					calculation.questionnaireData?.pilotSupportRequired,
				autoMlRequired: calculation.questionnaireData?.autoMlRequired,
				productionAdditionalReports:
					calculation.questionnaireData?.productionAdditionalReports,
			};

			if (calculation.questionnaireData?.generalUncertainty) {
				const uncertainties = Array.isArray(
					calculation.questionnaireData.generalUncertainty,
				)
					? calculation.questionnaireData.generalUncertainty
					: Object.entries(
							calculation.questionnaireData.generalUncertainty,
						).map(([type, value]) => ({
							type,
							probability: value.probability,
							influence: value.influence,
						}));

				uncertainties.forEach((uncertainty) => {
					switch (uncertainty.type) {
						case "businessProcessComplexity":
							row.riskBusinessProcess = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "projectSolutionDefects":
							row.riskSolutionDefects = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "adjacentProjectsImpact":
							row.riskAdjacentProjects = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "planningRequirementGaps":
							row.riskPlanningGaps = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "contractorPerformanceIssues":
							row.riskContractorPerformance = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "qualifiedStaffShortage":
							row.riskStaffShortage = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "sanctionsRisk":
							row.riskSanctions = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "controlProceduresGaps":
							row.riskControlProcedures = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "regulatoryChanges":
							row.riskRegulatoryChanges = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "systemUnderutilization":
							row.riskSystemUnderutilization = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
						case "itArchitectureChanges":
							row.riskItArchitecture = `${uncertainty.probability} / ${uncertainty.influence}`;
							break;
					}
				});
			}

			if (calculation.questionnaireData?.algorithmComplexity) {
				calculation.questionnaireData.algorithmComplexity.forEach((item) => {
					switch (item.algorithmType) {
						case "Табличные данные":
							row.algorithmTabular = "Да";
							break;
						case "Текстовая аналитика_Классические модели":
							row.algorithmTextClassic = "Да";
							break;
						case "Текстовая аналитика_LLM":
							row.algorithmTextLLM = "Да";
							break;
						case "Аудио Аналитика":
							row.algorithmAudio = "Да";
							break;
						case "Компьютерное зрение_CV":
							row.algorithmCV = "Да";
							break;
						case "Оптимизационная задача":
							row.algorithmOptimization = "Да";
							break;
						case "Гео-аналитика":
							row.algorithmGeo = "Да";
							break;
						case "Графовая аналитика":
							row.algorithmGraph = "Да";
							break;
					}
				});
			}

			if (calculation.questionnaireData?.productionDeploymentChannels) {
				calculation.questionnaireData.productionDeploymentChannels.forEach(
					(channel) => {
						const channelName =
							typeof channel === "string" ? channel : channel.deploymentChannel;
						switch (channelName) {
							case "Батч":
								row.deploymentBatch = "Да";
								break;
							case "Батч+загрузка данных потребителю":
								row.deploymentBatchLoad = "Да";
								break;
							case "Батч + Онлайн":
								row.deploymentBatchOnline = "Да";
								break;
							case "Онлайн":
								row.deploymentOnline = "Да";
								break;
							case "Онлайн gpu":
								row.deploymentOnlineGpu = "Да";
								break;
							case "Стриминг":
								row.deploymentStreaming = "Да";
								break;
							case "Мобильные устройства":
								row.deploymentMobile = "Да";
								break;
							case "LLM":
								row.deploymentLLM = "Да";
								break;
							case "Гео-сервисы":
								row.deploymentGeoServices = "Да";
								break;
							case "Внедрение в облаке":
								row.deploymentCloud = "Да";
								break;
							case "Графовая платформа":
								row.deploymentGraph = "Да";
								break;
						}
					},
				);
			}

			if (calculation.questionnaireData?.calculationResult) {
				calculation.questionnaireData.calculationResult.forEach((result) => {
					switch (result.stageName) {
						case "01. Постановка задачи":
						case "01. Постановка задачи.":
							row.stage01 = result.score;
							break;
						case "02. Поиск данных":
						case "02. Поиск данных.":
							row.stage02 = result.score;
							break;
						case "03. Построение витрины для разработки":
						case "03. Построение витрины для разработки.":
							row.stage03 = result.score;
							break;
						case "05А. Разработка пилотной модели (MVP)":
						case "05А. Разработка пилотной модели (MVP).":
							row.stage05a = result.score;
							break;
						case "05. Разработка модели":
						case "05. Разработка модели.":
							row.stage05 = result.score;
							break;
						case "AML Разработка":
						case "AML Разработка.":
							row.amlDevelopment = result.score;
							break;
						case "05В. Пилотирование модели":
						case "05В. Пилотирование модели.":
							row.stage05b = result.score;
							break;
						case "07. Разработка витрины для применения модели":
						case "07. Разработка витрины для применения модели.":
							row.stage07 = result.score;
							break;
						case "09. Адаптация и внедрение модели":
						case "09. Адаптация и внедрение модели.":
							row.stage09 = result.score;
							break;
						case "AML Внедрение":
						case "AML Внедрение.":
							row.amlImplementation = result.score;
							break;
					}
				});
			}

			worksheet.addRow(row);
		});

		worksheet.getRow(1).eachCell((cell) => {
			cell.font = { bold: true };
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFD3D3D3" },
			};
			cell.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			};
		});

		return workbook.xlsx.writeBuffer() as Promise<Buffer>;
	}
}
