import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { MultiSelectAutocompleteWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "@react-client/common/forms/widgets/RJSFObjectFieldTemplate";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import {
	AnketaCRUDFormNames,
	useAnketaCRUDFormsStore,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { assessmentCalculationsStore } from "@react-client/features/jsonFormGenerator/hooks/assessmentCalculationsStore";
import type FormRef from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import { withTheme } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type { RJSFSchema, TemplatesType, WidgetProps } from "@rjsf/utils";
import type React from "react";
import { useRef, useState } from "react";
import schema from "../schemas/calc_schema.json";
import { calc_uiSchema } from "../schemas/calc_uiSchema";
import type { FormData } from "../types/FormData";
import AlgorithmComplexityWidget from "../widgets/AlgorithmComplexityWidget";
import GeneralUncertaintyWidget from "../widgets/GeneralUncertaintyWidget";
import NumberInputWidget from "../widgets/NumberInputWidget";
import UniversalDependencyWidget from "../widgets/UniversalDependencyWidget";

const Form = withTheme(MuiTheme);

const templates: Partial<TemplatesType> = {
	ObjectFieldTemplate: RJSFObjectFieldTemplate,
};

const widgets = {
	TextWidget: TextFieldCustomWidget,
	SelectWidget: (props: WidgetProps) => {
		return <TextFieldCustomWidget {...props} select />;
	},
	NumberInputWidget,
	AlgorithmComplexityWidget,
	GeneralUncertaintyWidget,
	UniversalDependencyWidget,
	MultiSelectAutocompleteWidget,
};

export const ProjectAssessmentForm: React.FC<{ isCreate?: boolean }> = ({
	isCreate,
}) => {
	const formRef = useRef<FormRef>(null);
	const { setApiRef, resetApiRef, updateFormState, ...store } =
		useAnketaCRUDFormsStore();

	const [formData, setFormData] = useState<FormData>({
		modelsCount: 1,
		algorithmComplexity: [{ algorithmType: "" }],
		setupComplexity: "",
		readyPromReports: "",
		assessedInitiativesCount: 1,
		dataSourcesCount: "1",
		pilotModelRequired: "Не требуется",
		pilotSupportRequired: "Не требуется",
		autoMlRequired: "Не требуется",
		productionAdditionalReports: "1",
		productionDeploymentChannels: [],
		generalUncertainty: [],
	});
	const [liveValidate, setLiveValidate] = useState(false);

	const { setFormData: setFormDataForCalc } = assessmentCalculationsStore();

	const formName = isCreate
		? AnketaCRUDFormNames.anketaCreate_projectAssessmentForm
		: AnketaCRUDFormNames.anketaPreview_projectAssessmentForm;
	const readonly = !isCreate;
	const formDataStore = store[formName];
	const apiFormStore = formDataStore.api;
	const formState = apiFormStore?.state;
	const formStateFromRef = formRef?.current?.state;

	useDeepEffect(() => {
		setFormDataForCalc(formData);
	}, [formData]);

	// init api in store
	useDeepEffect(() => {
		if (formRef.current && !apiFormStore) {
			setApiRef(formName, formRef.current);
		}
	}, [formRef.current, isCreate]);

	useDeepEffect(() => {
		updateFormState(formName, formState);
	}, [formState]);

	const onChange = (e: IChangeEvent<FormData>) => {
		if (e.formData) {
			setFormData(e.formData);
		}
		if (formState) {
			updateFormState(formName, formState);
		}
	};

	const onSubmit = (e: IChangeEvent<FormData>) => {
		console.log("Submitted data:", e.formData);
		if (e.formData) {
			setFormData(e.formData);
		}
		updateFormState(formName, formStateFromRef);
	};

	const onError = (errors: any) => {
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
		console.log("Form errors:", errors);
	};

	const _onBlur = (id: string, data: any) => {
		console.log("Form onBlur:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const _onFocus = (id: string, data: any) => {
		setLiveValidate(true);

		console.log("Form onFocus:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	return (
		<>
			<Form
				ref={formRef}
				schema={schema as RJSFSchema}
				uiSchema={calc_uiSchema}
				validator={validatorRu}
				widgets={widgets}
				formData={formData}
				formContext={{ formData }}
				onChange={onChange}
				onSubmit={onSubmit}
				onFocus={_onFocus}
				onError={onError}
				templates={templates}
				// onFocus={onFocus}
				// onBlur={onBlur}
				focusOnFirstError
				liveValidate={liveValidate}
				noHtml5Validate
				readonly={readonly}
				showErrorList={false}
				data-test-id="project-assessment-form--Form-0"
			/>
		</>
	);
};
