import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { ArrayCustomCardListsWidget } from "@react-client/common/forms/widgets/ArrayCustomCardListsWidget";
import { MultiSelectAutocompleteWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "@react-client/common/forms/widgets/RJSFObjectFieldTemplate";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { mainCalcSchema } from "@react-client/features/jsonFormGenerator/schemas";
import AlgorithmComplexityWidget from "@react-client/features/jsonFormGenerator/widgets/AlgorithmComplexityWidget";
import GeneralUncertaintyWidget from "@react-client/features/jsonFormGenerator/widgets/GeneralUncertaintyWidget";
import NumberInputWidget from "@react-client/features/jsonFormGenerator/widgets/NumberInputWidget";
import UniversalDependencyWidget from "@react-client/features/jsonFormGenerator/widgets/UniversalDependencyWidget";
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
	"ui:submitButtonOptions": {
		norender: true,
	},
};

const templates: Partial<TemplatesType> = {
	ObjectFieldTemplate: RJSFObjectFieldTemplate,
};

const widgets: RegistryWidgetsType = {
	TextFieldCustomWidget,
	NumberInputWidget,
	AlgorithmComplexityWidget,
	GeneralUncertaintyWidget,
	UniversalDependencyWidget,
	MultiSelectAutocompleteWidget,
	ArrayCustomCardListsWidget,
};

export const ProjectAssessmentFormPreview = ({
	initialData,
}: {
	initialData: CalculationResponseDto;
}) => {
	const formData = initialData.questionnaireData;

	const _mainCalcSchema = omit(mainCalcSchema, ["required"]);

	return (
		<Form
			schema={_mainCalcSchema as RJSFSchema}
			uiSchema={uiSchema}
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			templates={templates}
			liveValidate={false}
			noHtml5Validate
			focusOnFirstError
			readonly
			noValidate
			showErrorList={false}
		/>
	);
};
