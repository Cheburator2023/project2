import { UiSchema } from "@rjsf/utils";

const uiSchema: UiSchema = {
	"ui:submitButtonOptions": {
		norender: true,
		submitText: "Сохранить",
	},
	description: {
		"ui:widget": "textarea",
		"ui:options": {
			rows: 5,
		},
	},
	projectName: {
		"ui:placeholder": "Введите название проекта",
	},
	algorithmComplexity: {
		"ui:widget": "AlgorithmComplexityWidget",
	},
	modelsCount: {
		"ui:widget": "NumberInputWidget",
	},
	uncertaintyAdjustment: {
		"ui:widget": "NumberInputWidget",
		"ui:options": {
			suffix: "%",
		},
	},
	generalUncertainty: {
		"ui:widget": "GeneralUncertaintyWidget",
	},
	assessedInitiativesCount: {
		"ui:widget": "UniversalDependencyWidget",
		"ui:options": {
			dependencies: [
				{
					condition: "readyPromReports === 'Да'",
					disabled: true,
					valueToSet: 1,
				},
			],
			defaultWidget: "NumberInputWidget",
		},
	},
	dataSourcesCount: {
		"ui:widget": "UniversalDependencyWidget",
		"ui:options": {
			disabled: true,
			disabledValue: "Нет",
			dependencies: [
				{
					condition:
						"readyPromReports === 'Нет' || productionAdditionalReports !== 'Не требуется'",
					disabled: false,
				},
			],
			defaultWidget: "SelectWidget",
		},
	},
	productionDeploymentChannels: {
		"ui:widget": "ProductionDeploymentChannelsWidget",
	},
	pilotSupportRequired: {
		"ui:widget": "UniversalDependencyWidget",
		"ui:options": {
			dependencies: [
				{
					condition: "pilotModelRequired === 'Не требуется'",
					disabled: true,
					valueToSet: "Не требуется",
					widget: "TextField",
				},
			],
			defaultWidget: "SelectWidget",
		},
	},
	autoMlRequired: {
		"ui:widget": "UniversalDependencyWidget",
		"ui:options": {
			dependencies: [
				{
					condition: "productionDeploymentChannels.length === 0",
					disabled: true,
					valueToSet: "Не требуется",
					widget: "TextField",
				},
			],
			defaultWidget: "SelectWidget",
		},
	},
	productionAdditionalReports: {
		"ui:widget": "UniversalDependencyWidget",
		"ui:options": {
			dependencies: [
				{
					condition:
						"productionDeploymentChannels.length === 0 && pilotSupportRequired === 'Не требуется'",
					disabled: true,
					valueToSet: "Не требуется",
					widget: "TextField",
				},
			],
			defaultWidget: "NumberInputWidget",
		},
	},
};

export default uiSchema;
