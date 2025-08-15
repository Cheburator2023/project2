export const coefficientDisplayNames: Record<string, string> = {
	modelsCountCoefficient: "Количество моделей",
	setupComplexityCoefficient: "Сложность постановки",
	generalUncertaintyCoefficient: "Общая неопределенность",
	readyPromReportsCoefficient: "Наличие готовых промышленных витрин",
	dataSourcesCountCoefficient: "Количество источников для проработки",
	pilotModelRequired: "Необходимость реализации пилотной модели",
	algorithmComplexityCoefficient: "Сложность алгоритма / тип ML задачи",
	pilotSupportRequired: "Необходимость поддержки проведения пилота",
	autoMlRequired: "Необходимость AutoML",
	productionAdditionalReportsCoefficient:
		"Необходимость продуктивизации и количество дополнительных витрин",
	deploymentChannelsCoefficient:
		"Необходимость продуктивизации и каналы внедрения моделей",
};

export const coefficientToFormFieldMapping: Record<string, string> = {
	modelsCountCoefficient: "modelsCount",
	setupComplexityCoefficient: "setupComplexity",
	generalUncertaintyCoefficient: "generalUncertainty",
	readyPromReportsCoefficient: "readyPromReports",
	dataSourcesCountCoefficient: "dataSourcesCount",
	pilotModelRequired: "pilotModelRequired",
	algorithmComplexityCoefficient: "algorithmComplexity",
	pilotSupportRequired: "pilotSupportRequired",
	autoMlRequired: "autoMlRequired",
	productionAdditionalReportsCoefficient: "productionAdditionalReports",
	deploymentChannelsCoefficient: "productionDeploymentChannels",
};
