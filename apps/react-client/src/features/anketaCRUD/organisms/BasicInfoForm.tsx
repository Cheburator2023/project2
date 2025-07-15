import { useQuestionnaireControllerGetFullQuestionnaire } from "@react-client/common/api/generated/queries/calculation";
import { CalculationResponseDto } from "@react-client/common/api/generated/types";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
import { transformErrors } from "@react-client/common/forms/transformErrors";
import { MultiSelectAutocompleteCreateWidget } from "@react-client/common/forms/widgets/MultiSelectAutocompleteCreateWidget";
import { TextFieldCustomWidget } from "@react-client/common/forms/widgets/TextFieldCustomWidget";
import { useDeepEffect } from "@react-client/common/hooks/useDeepEffect";
import {
	AnketaCRUDFormNames,
	basicInfoFormInitialData,
	IBasicFormData,
	useAnketaCRUDFormsStore,
} from "@react-client/features/anketaCRUD/stores/useAnketaCRUDFormsStore";
import type FormRef from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import Form from "@rjsf/mui";
import type {
	RegistryWidgetsType,
	RJSFSchema,
	TemplatesType,
	UiSchema,
} from "@rjsf/utils";
import { useEffect, useRef, useState } from "react";
import { MultiSelectAutocompleteWidget } from "../../../common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "../../../common/forms/widgets/RJSFObjectFieldTemplate";

interface BasicInfoFormProps {
	initialData?: CalculationResponseDto;
	disabled?: boolean;
	isCreate?: boolean;
	onChange?: (data: any) => void;
}

const uiSchema: UiSchema = {
	"ui:submitButtonOptions": {
		props: {
			disabled: false,
			className: "btn btn-info",
		},
		norender: true,
		submitText: "Submit",
	},
	"ui:order": [
		"name",
		"rfd",
		"streamExecutor",
		"department",
		"customerName",
		"relatedModels",
		"status",
		"createdAt",
		"id",
		"author",
		"comment",
	],
	name: {
		"ui:widget": "TextFieldCustomWidget",
		isEditable: true,
	},
	rfd: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:placeholder": "Отсутствует",
		"ui:options": {
			prefix: "RFD-",
			tooltip: "",
			errors: {
				pattern: "Только цифры, от 4 до 15 символов",
			},
		},
		isEditable: true,
	},
	streamExecutor: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			select: true,
			tooltip: "",
		},
	},
	department: {
		"ui:widget": "MultiSelectAutocompleteWidget",
		"ui:options": {
			tooltip: "",
		},
		isEditable: true,
	},
	customerName: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			tooltip: "",
		},
		isEditable: true,
	},
	// relatedModels: {
	// 	"ui:widget": "MultiSelectAutocompleteCreateWidget",
	// 	"ui:options": {
	// 		tooltip: "",
	// 	},
	// },
	comment: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			multiline: true,
			rows: 3,
		},
		isEditable: true,
	},
	// status: {
	// 	"ui:widget": "radio",
	// 	"ui:options": {
	// 		tooltip: "",
	// 	},
	// },
	createdAt: {
		"ui:widget": "date",
		"ui:options": {
			tooltip: "",
		},
	},
	id: {
		"ui:options": {
			tooltip: "",
		},
	},
	author: {
		"ui:options": {
			tooltip: "",
		},
	},
};

const templates: Partial<TemplatesType> = {
	ObjectFieldTemplate: RJSFObjectFieldTemplate,
	// FieldTemplate: RJSFFieldTemplate,
};

const widgets: RegistryWidgetsType = {
	MultiSelectAutocompleteWidget,
	MultiSelectAutocompleteCreateWidget,
	TextFieldCustomWidget,
};

export const BasicInfoForm = ({
	initialData,
	isCreate = false,
	disabled = false,
	onChange,
}: BasicInfoFormProps) => {
	const { data: questData, refetch } =
		useQuestionnaireControllerGetFullQuestionnaire({
			query: {
				staleTime: 0,
			},
		});
	const [formData, setFormData] = useState<IBasicFormData>(
		basicInfoFormInitialData,
	);

	const departmentENUM = questData?.referenceData.department;
	const streamExecutorENUM = questData?.referenceData.streamExecutor;

	const schema: RJSFSchema = {
		type: "object",
		required: ["name", "streamExecutor", "department"],
		properties: {
			name: {
				type: "string",
				title: "Название анкеты",
				minLength: 1,
				maxLength: 150,
			},
			rfd: {
				type: "string",
				title: "RFD",
				minLength: formData.rfd ? 8 : undefined,
				maxLength: formData.rfd ? 19 : undefined,
				pattern: formData.rfd ? "^(RFD-\\d{4,15})?$" : undefined,
			},
			streamExecutor: {
				type: "string",
				title: "Стрим-исполнитель",
				enum: streamExecutorENUM,
				minLength: 1,
			},
			department: {
				type: "array",
				title: "Департамент заказчика",
				items: {
					type: "string",
					enum: departmentENUM,
				},
				uniqueItems: true,
				minItems: 1,
			},
			customerName: {
				type: "string",
				title: "ФИО заказчика",
				maxLength: 150,
			},
			comment: {
				type: "string",
				title: "Комментарий",
				maxLength: 250,
			},
		},
	};

	const {
		setApiRef,
		updateFormState,
		setFormDirty,
		setFormValidated,
		setFormValid,
		incrementSubmitCount,
		...store
	} = useAnketaCRUDFormsStore();
	const [_liveValidate, setLiveValidate] = useState(false);

	const formRef = useRef<FormRef>(null);

	const formName = AnketaCRUDFormNames.anketaCreate_basicInfoForm;
	const formDataStore = store[formName];
	const apiFormStore = formDataStore.api;
	const formState = apiFormStore?.state;
	const formStateFromRef = formRef?.current?.state;

	// init api in store
	useDeepEffect(() => {
		if (formRef.current && !apiFormStore) {
			setApiRef(formName, formRef.current);
		}
	}, [formRef.current]);

	// useEffect(() => {
	// 	return () => {
	// 		console.log("🐸 RESET:", formName);
	// 		resetApiRef(formName);
	// 	};
	// }, []);

	useDeepEffect(() => {
		updateFormState(formName, formState);
	}, [formState]);

	useEffect(() => {
		if (initialData) {
			setFormData({ ...basicInfoFormInitialData, ...initialData });
		}
	}, [initialData]);

	const onChangeForm = (formState: IChangeEvent<IBasicFormData>) => {
		if (formState.formData) {
			setFormData(formState.formData);
		}
		if (formState) {
			setFormDirty(formName, true);
			updateFormState(formName, formState);
		}
		onChange?.(formState.formData);
	};

	const onSubmit = ({ formData }: IChangeEvent<IBasicFormData>) => {
		console.log("BasicInfoForm >> formData:", formData);
		setFormValidated(formName, true);
		setFormValid(formName, true);
		incrementSubmitCount(formName);

		if (formData) {
			setFormData(formData);
		}

		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onError = (errors: any) => {
		setFormValidated(formName, true);
		setLiveValidate(true);
		incrementSubmitCount(formName);

		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
		console.log("Form errors:", errors);
	};

	const onBlur = (_id: string, _data: any) => {
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onFocus = (_id: string, _data: any) => {
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	// In your uiSchema, set disabled for all fields by default, then override meta fields if in edit mode
	const controlledUiSchema = Object.fromEntries(
		Object.entries(uiSchema).map(([field, config]) => {
			if (!disabled && config.isEditable) {
				return [field, { ...config, "ui:disabled": false }];
			}
			return [field, { ...config, "ui:disabled": true }];
		}),
	);

	return (
		<Form
			ref={formRef}
			schema={schema}
			uiSchema={isCreate ? uiSchema : controlledUiSchema}
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			onChange={onChangeForm}
			onSubmit={onSubmit}
			onError={onError}
			onBlur={onBlur}
			onFocus={onFocus}
			templates={templates}
			liveValidate={false}
			noHtml5Validate
			focusOnFirstError
			showErrorList={false}
			transformErrors={transformErrors as any}
			data-test-id="basic-info-form--Form-0"
		/>
	);
};
