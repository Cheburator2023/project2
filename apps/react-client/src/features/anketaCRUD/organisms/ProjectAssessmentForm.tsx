import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { transformErrors } from "@react-client/common/forms/transformErrors";
import { RJSFObjectFieldTemplate } from "@react-client/common/forms/widgets/RJSFObjectFieldTemplate";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import {
	AnketaCRUDFormNames,
	projectAssessmentFormInitialData,
	useAnketaCRUDFormsStore,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import { assessmentCalculationsStore } from "@react-client/features/anketaCRUD/stores/assessmentCalculationsStore";
import { mainCalcSchema } from "@react-client/schemas";
import type FormRef from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import { withTheme } from "@rjsf/core";
import { Theme as MuiTheme } from "@rjsf/mui";
import type { RJSFSchema, TemplatesType, WidgetProps } from "@rjsf/utils";
import type React from "react";
import { useRef, useState } from "react";
import NumberInputWidget from "@react-client/common/forms/widgets/NumberInputWidget";
import { AlgorithmComplexityWidget } from "@react-client/common/forms/widgets/AlgorithmComplexityWidget";
import { GeneralUncertaintyWidget } from "@react-client/common/forms/widgets/GeneralUncertaintyWidget";
import { UniversalDependencyWidget } from "@react-client/common/forms/widgets/UniversalDependencyWidget";
import { IAssessmentFormData } from "../types/FormData";
import { calc_uiSchema } from "../../../schemas/calculation/calc_uiSchema";

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
	TextFieldCustomWidget,
};

export const ProjectAssessmentForm: React.FC<{
	isCreate?: boolean;
}> = ({ isCreate }) => {
	const formRef = useRef<FormRef>(null);
	const {
		setApiRef,
		resetApiRef,
		updateFormState,
		setFormValidated,
		setFormValid,
		incrementSubmitCount,
		setFormError,
		clearFormError,
		clearAllFormErrors,
		setFormErrors,
		...store
	} = useAnketaCRUDFormsStore();
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
		console.log("ProjectAssessmentForm >> formData:", e.formData);
		setFormValidated(formName, true);
		setFormValid(formName, true);
		incrementSubmitCount(formName);
		clearAllFormErrors(formName);

		if (e.formData) {
			setFormData(e.formData);
		}
		updateFormState(formName, formStateFromRef);
	};

	const onError = (errors: any) => {
		setFormValidated(formName, true);
		setFormValid(formName, false);
		setLiveValidate(true);
		incrementSubmitCount(formName);

		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}

		if (errors && errors.length > 0) {
			const errorMap: Record<string, string> = {};
			errors.forEach((error: any) => {
				if (error.property && error.message) {
					errorMap[error.property] = error.message;
				}
			});
			setFormErrors(formName, errorMap);
		} else {
			clearAllFormErrors(formName);
		}

		console.log("Form errors:", errors);
	};

	const onFocus = (_id: string, _data: any) => {
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onBlur = (_id: string, _data: any) => {
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
				liveValidate={liveValidate && isCreate}
				noHtml5Validate
				showErrorList={false}
				transformErrors={transformErrors as any}
				data-test-id="project-assessment-form--Form-0"
			/>
		</>
	);
};
