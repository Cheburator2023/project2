import { useQuestionnaireControllerGetFullQuestionnaire } from "@react-client/common/api/generated/queries/calculation";
import { validatorRu } from "@react-client/common/forms/rjsfLocaleRu";
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
import { useRef, useState } from "react";
import { MultiSelectAutocompleteWidget } from "../../../common/forms/widgets/MultiSelectAutocompleteWidget";
import { RJSFObjectFieldTemplate } from "../../../common/forms/widgets/RJSFObjectFieldTemplate";

interface ValidationError {
	name: string;
	message: string;
	property?: string;
	instancePath?: string;
}

interface FieldUiSchema {
	"ui:options"?: {
		errors?: Record<string, string>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

function transformErrors(
	errors: ValidationError[],
	uiSchema: Record<string, FieldUiSchema>,
): ValidationError[] {
	return errors.map((error: ValidationError) => {
		const fieldPath =
			error.property?.replace(".", "") ||
			error.instancePath?.replace(/^\//, "");

		const fieldUiSchema = fieldPath ? uiSchema[fieldPath] : null;

		if (fieldUiSchema?.["ui:options"]?.errors?.[error.name]) {
			error.message = fieldUiSchema["ui:options"].errors[error.name];
		} else if (
			error.name === "pattern" &&
			fieldUiSchema?.["ui:options"]?.errors?.pattern
		) {
			error.message = fieldUiSchema["ui:options"].errors.pattern;
		}

		return error;
	});
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
	},
	customerName: {
		"ui:widget": "TextFieldCustomWidget",
		"ui:options": {
			tooltip: "",
		},
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

export const BasicInfoForm = () => {
	const { data: questData } = useQuestionnaireControllerGetFullQuestionnaire();
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

	const { setApiRef, updateFormState, setFormDirty, ...store } =
		useAnketaCRUDFormsStore();
	const [liveValidate, setLiveValidate] = useState(false);

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

	const onChange = (formState: IChangeEvent<IBasicFormData>) => {
		if (formState.formData) {
			setFormData(formState.formData);
		}
		if (formState) {
			setFormDirty(formName, true);
			updateFormState(formName, formState);
		}
	};

	const onSubmit = ({ formData }: IChangeEvent<IBasicFormData>) => {
		console.log("🐸 BasicInfoForm >> formData:", formData);

		if (formData) {
			setFormData(formData);
		}

		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onError = (errors: any) => {
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
		console.log("Form errors:", errors);
	};

	const onBlur = (id: string, data: any) => {
		console.log("Form onBlur:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	const onFocus = (id: string, data: any) => {
		setLiveValidate(true);

		console.log("Form onFocus:", id, data);
		if (formStateFromRef) {
			updateFormState(formName, formStateFromRef);
		}
	};

	return (
		<Form
			ref={formRef}
			schema={schema}
			uiSchema={uiSchema}
			formData={formData}
			validator={validatorRu}
			widgets={widgets}
			onChange={onChange}
			onSubmit={onSubmit}
			onError={onError}
			onBlur={onBlur}
			onFocus={onFocus}
			templates={templates}
			liveValidate={liveValidate}
			noHtml5Validate
			focusOnFirstError
			showErrorList={false}
			transformErrors={transformErrors as any}
			data-test-id="basic-info-form--Form-0"
		/>
	);
};
