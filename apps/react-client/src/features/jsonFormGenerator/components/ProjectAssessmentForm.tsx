import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { MultiSelectAutocompleteWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "@react-client/common/forms/widgets/RJSFObjectFieldTemplate";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import {
	AnketaCRUDFormNames,
	projectAssessmentFormInitialData,
	useAnketaCRUDFormsStore,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { assessmentCalculationsStore } from "@react-client/features/jsonFormGenerator/hooks/assessmentCalculationsStore";
import { mainCalcSchema } from "@react-client/features/jsonFormGenerator/schemas";
import type FormRef from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import { withTheme } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type { RJSFSchema, TemplatesType, WidgetProps } from "@rjsf/utils";
import type React from "react";
import { useRef, useState } from "react";
import { calc_uiSchema } from "../schemas/calc_uiSchema";
import type { IAssessmentFormData } from "../types/FormData";
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

export const ProjectAssessmentForm: React.FC<{}> = () => {
	const formRef = useRef<FormRef>(null);
	const { setApiRef, resetApiRef, updateFormState, ...store } =
		useAnketaCRUDFormsStore();
	const { setFormData: setFormDataForCalc } = assessmentCalculationsStore();

	const [formData, setFormData] = useState<IAssessmentFormData>(
		projectAssessmentFormInitialData,
	);

	const [liveValidate, setLiveValidate] = useState(false);

	const formName = AnketaCRUDFormNames.anketaCreate_projectAssessmentForm;
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
	}, [formRef.current]);

	useDeepEffect(() => {
		updateFormState(formName, formState);
	}, [formState]);

	const onChange = (e: IChangeEvent<IAssessmentFormData>) => {
		if (e.formData) {
			setFormData(e.formData);
		}
		if (formState) {
			updateFormState(formName, formState);
		}
	};

	const onSubmit = (e: IChangeEvent<IAssessmentFormData>) => {
		console.log("🐸 ProjectAssessmentForm >> formData:", e.formData);

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

	const onFocus = (id: string, data: any) => {
		setLiveValidate(true);

		console.log("Form onFocus:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onBlur = (id: string, data: any) => {
		console.log("Form onBlur:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	return (
		<>
			<Form
				ref={formRef}
				schema={mainCalcSchema as RJSFSchema}
				uiSchema={calc_uiSchema}
				validator={validatorRu}
				widgets={widgets}
				formData={formData}
				formContext={{ formData }}
				onChange={onChange}
				onSubmit={onSubmit}
				onFocus={onFocus}
				onError={onError}
				onBlur={onBlur}
				templates={templates}
				focusOnFirstError
				liveValidate={liveValidate}
				noHtml5Validate
				showErrorList={false}
				data-test-id="project-assessment-form--Form-0"
			/>
		</>
	);
};
