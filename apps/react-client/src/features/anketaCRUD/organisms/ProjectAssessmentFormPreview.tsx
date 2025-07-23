import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { RJSFObjectFieldTemplate } from "@react-client/common/forms/widgets/RJSFObjectFieldTemplate";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useEffectOnce } from "@react-client/common/hooks/useEffectOnce";
import { assessmentCalculationsStore } from "@react-client/features/anketaCRUD/stores/assessmentCalculationsStore";
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

const uiSchema: UiSchema = {
	generalUncertainty: {
		"ui:widget": "ArrayCustomCardListsWidget",
	},
	algorithmComplexity: {
		"ui:widget": "ArrayCustomCardListsWidget",
	},
	productionDeploymentChannels: {
		"ui:widget": "TextFieldCustomWidget",
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
	const { setFormData: setFormDataForCalc } = assessmentCalculationsStore();

	const formData = initialData?.questionnaireData;

	const _mainCalcSchema = omit(mainCalcSchema, ["required"]);

	useEffectOnce(() => {
		setFormDataForCalc({
			modelsCount: formData.modelsCount,
			generalUncertainty: formData.generalUncertainty as any,
			assessedInitiativesCount: formData.assessedInitiativesCount,
			algorithmComplexity: formData.algorithmComplexity,
			autoMlRequired: formData.autoMlRequired,
			productionAdditionalReports: formData.productionAdditionalReports,
			productionDeploymentChannels:
				formData.productionDeploymentChannels as any,
			setupComplexity: formData.setupComplexity,
			readyPromReports: formData.readyPromReports,
			dataSourcesCount: formData.dataSourcesCount,
			pilotModelRequired: formData.pilotModelRequired,
			pilotSupportRequired: formData.pilotSupportRequired,
		});
	}, !!formData);

	return (
		<Form
			schema={_mainCalcSchema as RJSFSchema}
			uiSchema={uiSchema}
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
