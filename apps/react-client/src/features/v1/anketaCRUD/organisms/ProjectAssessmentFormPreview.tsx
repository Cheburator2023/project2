import type { CalculationResponseDto } from "@smart-anketa/api-contract";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { RJSFObjectFieldTemplate } from "@react-client/common/forms/widgets/RJSFObjectFieldTemplate";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useEffectOnce } from "@react-client/common/hooks/useEffectOnce";
import { assessmentCalculationsStore } from "@react-client/features/v1/anketaCRUD/stores/assessmentCalculationsStore";
import { mainCalcSchema } from "@react-client/schemas";
import { AlgorithmComplexityWidget } from "@react-client/common/forms/widgets/AlgorithmComplexityWidget";
import { GeneralUncertaintyWidget } from "@react-client/common/forms/widgets/GeneralUncertaintyWidget";
import { NumberInputWidget } from "@react-client/common/forms/widgets/NumberInputWidget";
import { UniversalDependencyWidget } from "@react-client/common/forms/widgets/UniversalDependencyWidget";
import Form from "@rjsf/mui";
import type {
	RegistryWidgetsType,
	RJSFSchema,
	TemplatesType,
	UiSchema,
} from "@rjsf/utils";
import { omit } from "lodash-es";
import { createSchemaWithCoefficients } from "../../../../schemas/calculation/calc_uiSchemaWithCoefficients";
import { useMemo } from "react";

const _uiSchema: UiSchema = {
	setupComplexity: {
		"ui:options": {
			valToTitle: true,
		},
	},
	generalUncertainty: {
		"ui:widget": "ArrayCustomCardListsWidget",
	},
	algorithmComplexity: {
		"ui:widget": "ArrayCustomCardListsWidget",
	},
	productionDeploymentChannels: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:placeholder": "Не требуется",
		"ui:options": {
			select: true,
			multiple: true,
			noDelete: true,
		},
	},
	"ui:submitButtonOptions": {
		norender: true,
	},
};

const _templates: Partial<TemplatesType> = {
	ObjectFieldTemplate: RJSFObjectFieldTemplate,
};

const widgets: RegistryWidgetsType = {
	TextFieldCustomWidget,
	NumberInputWidget,
	AlgorithmComplexityWidget,
	GeneralUncertaintyWidget,
	UniversalDependencyWidget,
	ArrayCustomCardListsWidget,
};

export const ProjectAssessmentFormPreview = ({
	initialData,
}: {
	initialData: CalculationResponseDto;
}) => {
	const { setFormData: setFormDataForCalc, coefficients } =
		assessmentCalculationsStore();

	const formData = initialData?.questionnaireData;

	const _mainCalcSchema = omit(mainCalcSchema, ["required"]);

	useEffectOnce(() => {
		setFormDataForCalc({
			modelDeveloped: (formData as any).modelDeveloped || "Нет",
			modelsCount: formData.modelsCount,
			initiativeTimeline:
				formData.initiativeTimeline == null
					? undefined
					: formData.initiativeTimeline,
			initiativeCost:
				formData.initiativeCost == null ? undefined : formData.initiativeCost,
			generalUncertainty: formData.generalUncertainty as any,
			assessedInitiativesCount: formData.assessedInitiativesCount,
			algorithmComplexity: formData.algorithmComplexity,
			autoMlRequired: formData.autoMlRequired,
			productionAdditionalReports: formData.productionAdditionalReports ?? "",
			productionDeploymentChannels:
				formData.productionDeploymentChannels as any,
			setupComplexity: formData.setupComplexity,
			readyPromReports: formData.readyPromReports ?? "",
			dataSourcesCount: formData.dataSourcesCount,
			pilotModelRequired: formData.pilotModelRequired,
			pilotSupportRequired: formData.pilotSupportRequired,
			uncertaintyAdjustment: formData.uncertaintyAdjustment,
		});
	}, !!formData);

	const { uiSchema: uiSchemaWithCoefficients, schema: schemaWithCoefficients } =
		useMemo(() => {
			return createSchemaWithCoefficients(coefficients, true);
		}, [coefficients]);

	return (
		<Form
			schema={
				omit(schemaWithCoefficients, ["properties.description"]) as RJSFSchema
			}
			uiSchema={uiSchemaWithCoefficients}
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			// templates={templates}
			liveValidate={false}
			noHtml5Validate
			focusOnFirstError
			noValidate
			showErrorList={false}
		/>
	);
};
